import CryptoCompareService from '../services/third-party/cryptocompare.service.js';
import CoinCapService from '../services/third-party/coincap.service.js';
import CoinMarketCapService from '../services/third-party/coinmarketcap.service.js';
import RedisService from '../services/redis/redis.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

export class CombinedController {
    static getAggregatedPrice = catchAsync(async (req, res) => {
        try {
            const { symbol } = req.params;
            const symbolMap = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin'
                // Add more mappings as needed
            };

            const coinCapId = symbolMap[symbol.toUpperCase()];
            if (!coinCapId) {
                throw new ApiError(400, 'Unsupported symbol');
            }

            const [cryptoComparePrice, coinCapPrice, cmcPrice] = await Promise.all([
                CryptoCompareService.getSymbolPrice(symbol),
                CoinCapService.getAssetDetails(coinCapId),
                CoinMarketCapService.getCryptoQuotes(symbol)
            ]);

            const aggregatedPrice = this.calculateWeightedAverage([
                { price: cryptoComparePrice, weight: 0.4 },
                { price: coinCapPrice.priceUsd, weight: 0.3 },
                { price: cmcPrice[0].price, weight: 0.3 }
            ]);

            return res.json({
                status: 'success',
                data: {
                    symbol: symbol.toUpperCase(),
                    price: aggregatedPrice,
                    marketCap: coinCapPrice.marketCapUsd,
                    volume24h: coinCapPrice.volumeUsd24Hr,
                    change24h: coinCapPrice.changePercent24Hr,
                    lastUpdated: new Date().toISOString(),
                    sources: {
                        cryptoCompare: cryptoComparePrice,
                        coinCap: coinCapPrice.priceUsd,
                        coinMarketCap: cmcPrice
                    }
                }
            });
        } catch (error) {
            throw new ApiError(500, error.message);
        }
    });

    static getMarketSummary = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '24h' } = req.query;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        const cacheKey = `market:summary:${symbol}:${timeframe}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const [price, volume, socialData, marketCap] = await Promise.all([
            this.getAggregatedPrice(symbol),
            CoinCapService.getAssetVolume(symbol),
            CryptoCompareService.getSocialData(symbol),
            CoinMarketCapService.getMarketCap(symbol)
        ]);

        const summary = {
            price,
            volume,
            socialData,
            marketCap,
            timeframe,
            timestamp: new Date()
        };

        await RedisService.set(cacheKey, summary, 300);
        res.json({ status: 'success', data: summary });
    });

    static getComprehensiveAnalysis = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '24h', indicators = [] } = req.query;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        const cacheKey = `analysis:comprehensive:${symbol}:${period}`;
        const cachedAnalysis = await RedisService.get(cacheKey);
        if (cachedAnalysis) return res.json({ status: 'success', data: cachedAnalysis });

        const [
            marketData,
            technicalIndicators,
            socialSentiment,
            onChainMetrics
        ] = await Promise.all([
            this.getMarketSummary(symbol),
            CryptoCompareService.getTechnicalIndicators(symbol, indicators),
            CryptoCompareService.getSocialData(symbol),
            this.getBlockchainMetrics(symbol)
        ]);

        const analysis = {
            marketData,
            technicalIndicators,
            socialSentiment,
            onChainMetrics,
            period,
            timestamp: new Date()
        };

        await RedisService.set(cacheKey, analysis, 600);
        res.json({ status: 'success', data: analysis });
    });

    static getBlockchainMetrics = catchAsync(async (req, res) => {
        const { symbol, network = 'all' } = req.params;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        const cacheKey = `metrics:blockchain:${symbol}:${network}`;
        const cachedMetrics = await RedisService.get(cacheKey);
        if (cachedMetrics) return res.json({ status: 'success', data: cachedMetrics });

        const [ethMetrics, bscMetrics] = await Promise.all([
            getEthereumMetrics(symbol),
            getBSCMetrics(symbol)
        ]);

        const metrics = {
            ethereum: ethMetrics,
            bsc: bscMetrics,
            timestamp: new Date()
        };

        await RedisService.set(cacheKey, metrics, 300);
        res.json({ status: 'success', data: metrics });
    });

    static getCrossExchangeData = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { exchanges = ['binance', 'coinbase', 'kraken'] } = req.query;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        if (!Array.isArray(exchanges)) {
            throw new ApiError(400, 'Exchanges must be an array');
        }

        const cacheKey = `exchange:cross:${symbol}:${exchanges.join(',')}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await Promise.all(
            exchanges.map(exchange =>
                CryptoCompareService.getExchangePrice(symbol, exchange)
            )
        );

        const result = data.reduce((acc, curr, idx) => {
            acc[exchanges[idx]] = curr;
            return acc;
        }, {});

        await RedisService.set(cacheKey, result, 60);
        res.json({ status: 'success', data: result });
    });

    static calculateWeightedAverage(prices) {
        return prices.reduce((acc, { price, weight }) => acc + (price * weight), 0);
    }
}

export default CombinedController;