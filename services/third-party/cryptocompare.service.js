import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { CryptoCompareHelper } from '../../utils/helpers/third-party/cryptocompare.helper.js';
import { TechnicalHelper } from '../../utils/helpers/technical.helper.js';
export class CryptoCompareService {
    async getCurrentPrice() {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/pricemultifull', {
                fsyms: 'BTC,ETH,BNB,XRP,ADA',  // Default top coins
                tsyms: 'USD'
            });
            return CryptoCompareHelper.formatPriceData(response.RAW);
        } catch (error) {
            logger.error('CryptoCompare getCurrentPrice error:', error);
            throw new ApiError(500, 'Failed to fetch current prices');
        }
    }

    async getSymbolPrice(symbol) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/price', {
                fsym: symbol.toUpperCase(),
                tsyms: 'USD'
            });
            return response.USD;
        } catch (error) {
            logger.error('CryptoCompare getSymbolPrice error:', error);
            throw new ApiError(500, 'Failed to fetch symbol price');
        }
    }

    async getHistoricalData(symbol, limit = 100, aggregate = 1) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/v2/histoday', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD',
                limit,
                aggregate
            });
            return CryptoCompareHelper.formatHistoricalData(response.Data.Data);
        } catch (error) {
            logger.error('CryptoCompare getHistoricalData error:', error);
            throw new ApiError(500, 'Failed to fetch historical data');
        }
    }

    async getTopExchanges(symbol) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/top/exchanges', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD'
            });
            return CryptoCompareHelper.formatExchangeData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getTopExchanges error:', error);
            throw new ApiError(500, 'Failed to fetch top exchanges');
        }
    }

    async getOHLCV(symbol, limit = 100, aggregate = 1) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/v2/histominute', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD',
                limit,
                aggregate
            });
            return CryptoCompareHelper.formatOHLCVData(response.Data.Data);
        } catch (error) {
            logger.error('CryptoCompare getOHLCV error:', error);
            throw new ApiError(500, 'Failed to fetch OHLCV data');
        }
    }

    async getVolume(symbol) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/exchange/symbol/histoday', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD'
            });
            return CryptoCompareHelper.formatVolumeData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getVolume error:', error);
            throw new ApiError(500, 'Failed to fetch volume data');
        }
    }

    async getLatestNews(categories = '', limit = 20) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/v2/news/', {
                categories,
                lTs: Math.floor(Date.now() / 1000),
                lang: 'EN',
                sortOrder: 'latest',
                limit
            });
            return CryptoCompareHelper.formatNewsData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getLatestNews error:', error);
            throw new ApiError(500, 'Failed to fetch latest news');
        }
    }

    async getNewsCategories() {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/news/categories');
            return response.map(category => ({
                categoryName: category.categoryName,
                wordsAssociated: category.wordsAssociatedWithCategory
            }));
        } catch (error) {
            logger.error('CryptoCompare getNewsCategories error:', error);
            throw new ApiError(500, 'Failed to fetch news categories');
        }
    }

    async getSocialData(symbol) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/social/coin/latest', {
                fsym: symbol.toUpperCase()
            });
            return CryptoCompareHelper.formatSocialData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getSocialData error:', error);
            throw new ApiError(500, 'Failed to fetch social data');
        }
    }

    async getMarketAnalysis(symbol, period = '24h') {
        try {
            const [priceData, volumeData, socialData] = await Promise.all([
                this.getHistoricalData(symbol),
                this.getVolume(symbol),
                this.getSocialData(symbol)
            ]);

            return {
                price: priceData,
                volume: volumeData,
                social: socialData,
                period,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('CryptoCompare getMarketAnalysis error:', error);
            throw new ApiError(500, 'Failed to fetch market analysis');
        }
    }

    async getMarketData(symbol) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/pricemultifull', {
                fsyms: symbol,
                tsyms: 'USD'
            });

            return response.RAW[symbol].USD;
        } catch (error) {
            throw new Error(`CryptoCompare market data error: ${error.message}`);
        }
    }

    async getMultiExchangePrices(symbol, exchanges) {
        try {
            const response = await CryptoCompareHelper.makeRequest('/data/pricemulti', {
                fsyms: symbol,
                tsyms: 'USD',
                e: exchanges.join(',')
            });

            // Transform the response to be more readable
            const exchangeData = {};
            exchanges.forEach(exchange => {
                exchangeData[exchange] = {
                    price: response[symbol]?.USD || null,
                    exchange: exchange,
                    available: response[symbol]?.USD !== undefined
                };
            });

            return exchangeData;
        } catch (error) {
            throw new Error(`CryptoCompare multi exchange price error: ${error.message}`);
        }
    }

    async getTechnicalIndicators(symbol, indicators = ['RSI', 'MACD', 'EMA'], period = '1d', interval = '1h') {
        try {
            // First get OHLCV data to calculate indicators
            const ohlcvData = await this.getOHLCV(symbol, 100, 1); // Get last 100 data points

            if (!ohlcvData || !Array.isArray(ohlcvData)) {
                throw new ApiError(500, 'Failed to fetch OHLCV data');
            }

            const results = {};
            const closePrices = ohlcvData.map(candle => candle.close);

            for (const indicator of indicators) {
                switch (indicator) {
                    case 'RSI':
                        const rsiValue = TechnicalHelper.calculateRSI(closePrices);
                        results.RSI = {
                            value: parseFloat(rsiValue.toFixed(2)),
                            signal: TechnicalHelper.getRSISignal(rsiValue),
                            timestamp: new Date()
                        };
                        break;

                    case 'MACD':
                        const macdResult = TechnicalHelper.calculateMACD(closePrices);
                        results.MACD = {
                            value: parseFloat(macdResult.macd.toFixed(2)),
                            signal: parseFloat(macdResult.signal.toFixed(2)),
                            histogram: parseFloat(macdResult.histogram.toFixed(2)),
                            timestamp: new Date()
                        };
                        break;

                    case 'EMA':
                        const emaValue = TechnicalHelper.calculateEMA(closePrices, 14);
                        results.EMA = {
                            value: parseFloat(emaValue.toFixed(2)),
                            period: 14,
                            timestamp: new Date()
                        };
                        break;
                }
            }

            return {
                ...results,
                metadata: {
                    symbol: symbol.toUpperCase(),
                    period,
                    interval,
                    indicators,
                    calculatedAt: new Date(),
                    nextUpdate: new Date(Date.now() + 300000) // 5 minutes cache
                }
            };

        } catch (error) {
            logger.error('CryptoCompare getTechnicalIndicators error:', error);
            throw new ApiError(500, 'Failed to fetch technical indicators');
        }
    }

    async getPrices(symbols, exchanges) {
        try {
            const symbolList = Array.isArray(symbols) ? symbols : [symbols];
            const exchangeList = exchanges || ['binance', 'coinbase', 'kraken', 'huobi'];

            // Create a result object to store prices for each exchange
            const result = {};
            exchangeList.forEach(exchange => {
                result[exchange] = {};
            });

            // Fetch prices for each symbol
            await Promise.all(symbolList.map(async (symbol) => {
                try {
                    // Get price for each exchange for this symbol
                    const response = await CryptoCompareHelper.makeRequest('/data/price', {
                        fsym: symbol.toUpperCase(),
                        tsyms: 'USD',
                        e: exchangeList.join(',')
                    });

                    // Add price to each exchange's result
                    exchangeList.forEach(exchange => {
                        if (response && response.USD) {
                            result[exchange][symbol] = parseFloat(response.USD);
                        }
                    });
                } catch (error) {
                    logger.error(`Error fetching price for ${symbol}:`, error);
                }
            }));

            return result;
        } catch (error) {
            logger.error('CryptoCompare getPrices error:', error);
            throw new ApiError(500, 'Failed to fetch prices');
        }
    }

    async getHistoricalArbitrage(pair, timeframe = '24h', exchange) {
        try {
            // Convert timeframe to hours for API
            const hours = timeframe === '24h' ? 24 :
                timeframe === '7d' ? 168 :
                    timeframe === '30d' ? 720 : 24;

            const [symbol1, symbol2] = pair.split('/');

            const responses = await Promise.all([
                this.getHistoricalData(symbol1, hours),
                this.getHistoricalData(symbol2, hours)
            ]);

            const history = TechnicalHelper.calculateArbitrageHistory(responses[0], responses[1], exchange);
            return history;
        } catch (error) {
            logger.error('CryptoCompare getHistoricalArbitrage error:', error);
            throw new ApiError(500, 'Failed to fetch historical arbitrage data');
        }
    }
}

export default new CryptoCompareService();