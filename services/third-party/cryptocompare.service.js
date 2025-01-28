import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { CryptoCompareHelper } from '../../utils/helpers/third-party/cryptocompare.helper.js';
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
                wordsAssociated: category.wordsAssociated
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
                CryptoCompareHelper.getHistoricalData(symbol),
                CryptoCompareHelper.getVolume(symbol),
                CryptoCompareHelper.getSocialData(symbol)
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
}

export default new CryptoCompareService();