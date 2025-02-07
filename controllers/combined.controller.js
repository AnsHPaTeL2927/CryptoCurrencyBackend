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
        try {
            const { symbol } = req.params;
            const symbolMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin' };
            const coinCapId = symbolMap[symbol.toUpperCase()];

            // Get data from all services in parallel
            const [price, volume, marketCap] = await Promise.all([
                CryptoCompareService.getSymbolPrice(symbol),
                CoinCapService.getAssetVolume(coinCapId),
                CoinMarketCapService.getMarketCap(symbol)
            ]);

            // Build market summary
            return res.json({
                status: 'success',
                data: {
                    symbol: symbol.toUpperCase(),
                    currentStats: {
                        price: price,
                        volume24h: volume,
                        marketCap: marketCap,
                        priceChange24h: price.change24h || 0
                    },
                    market: {
                        rank: volume.rank,
                        dominance: marketCap.dominance,
                        supply: {
                            circulating: marketCap.circulatingSupply,
                            total: marketCap.totalSupply
                        }
                    },
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (error) {
            throw new ApiError(500, `Market summary error: ${error.message}`);
        }
    })

    static getComprehensiveAnalysis = catchAsync(async (req, res) => {
        try {
            const { symbol } = req.params;

            const cacheKey = `analysis:comprehensive:${symbol}`;

            // Try to get from cache first
            const cachedData = await RedisService.get(cacheKey);
            if (cachedData) {
                return res.json({
                    status: 'success',
                    data: cachedData,
                    source: 'cache'
                });
            }

            const symbolMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin' };
            const coinCapId = symbolMap[symbol.toUpperCase()];

            // Get data from all services in parallel
            const [cryptoCompareData, coinCapData, cmcData] = await Promise.all([
                CryptoCompareService.getMarketData(symbol),
                CoinCapService.getAssetDetails(coinCapId),
                CoinMarketCapService.getQuote(symbol)
            ]);

            const analysisData = {
                symbol: symbol.toUpperCase(),
                price: {
                    current: cryptoCompareData.PRICE,
                    high24h: cryptoCompareData.HIGH24HOUR,
                    low24h: cryptoCompareData.LOW24HOUR,
                    open24h: cryptoCompareData.OPEN24HOUR
                },
                change: {
                    absolute24h: cryptoCompareData.CHANGE24HOUR,
                    percentage24h: cryptoCompareData.CHANGEPCT24HOUR
                },
                volume: {
                    volume24h: cryptoCompareData.VOLUME24HOUR,
                    volumeUSD: cryptoCompareData.VOLUME24HOURTO
                },
                market: {
                    cap: coinCapData.marketCapUsd,
                    rank: coinCapData.rank,
                    supply: {
                        circulating: coinCapData.circulatingSupply,
                        total: coinCapData.supply,
                        max: coinCapData.maxSupply
                    }
                },
                additionalMetrics: {
                    dominance: cmcData.quote.USD.market_cap_dominance,
                    volumeChange24h: cmcData.quote.USD.volume_change_24h,
                    percentChange: {
                        '1h': cmcData.quote.USD.percent_change_1h,
                        '24h': cmcData.quote.USD.percent_change_24h,
                        '7d': cmcData.quote.USD.percent_change_7d
                    }
                },
                lastUpdated: new Date().toISOString()
            };

            // Cache the data for 5 minutes (300 seconds)
            await RedisService.set(cacheKey, analysisData, 300);

            return res.json({
                status: 'success',
                data: analysisData,
                source: 'api'
            });
        } catch (error) {
            throw new ApiError(500, `Analysis error: ${error.message}`);
        }
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