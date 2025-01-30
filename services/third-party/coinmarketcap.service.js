import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { CoinMarketCapHelper } from '../../utils/helpers/third-party/coinmarketcap.helper.js';

export class CoinMarketCapService {

    async getLatestListings(start = 1, limit = 100, convert = 'USD') {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/cryptocurrency/listings/latest', {
                start,
                limit,
                convert
            });
            return CoinMarketCapHelper.formatListings(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getLatestListings error:', error);
            throw new ApiError(500, 'Failed to fetch latest listings');
        }
    }

    async getCryptoMetadata(symbol) {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/cryptocurrency/info', {
                symbol: symbol.toUpperCase()
            });
            return CoinMarketCapHelper.formatMetadata(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoMetadata error:', error);
            throw new ApiError(500, 'Failed to fetch crypto metadata');
        }
    }

    async getCryptoQuotes(symbol) {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/cryptocurrency/quotes/latest', {
                symbol: symbol.toUpperCase()
            });
            return CoinMarketCapHelper.formatQuotes(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoQuotes error:', error);
            throw new ApiError(500, 'Failed to fetch crypto quotes');
        }
    }

    async getTrendingCrypto() {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/cryptocurrency/trending/latest');
            return CoinMarketCapHelper.formatTrending(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getTrendingCrypto error:', error);
            throw new ApiError(500, 'Failed to fetch trending cryptocurrencies');
        }
    }

    async getGlobalMetrics() {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/global-metrics/quotes/latest');
            return CoinMarketCapHelper.formatGlobalMetrics(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getGlobalMetrics error:', error);
            throw new ApiError(500, 'Failed to fetch global metrics');
        }
    }

    async getCryptoCategories() {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/cryptocurrency/categories');
            return CoinMarketCapHelper.formatCategories(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoCategories error:', error);
            throw new ApiError(500, 'Failed to fetch crypto categories');
        }
    }

    async getExchangeListings(start = 1, limit = 100) {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/exchange/listings/latest', {
                start,
                limit
            });
            return CoinMarketCapHelper.formatExchangeListings(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getExchangeListings error:', error);
            throw new ApiError(500, 'Failed to fetch exchange listings');
        }
    }

    async getPriceConversion(amount, symbol, convert = 'USD') {
        try {
            const response = await CoinMarketCapHelper.makeRequest('/tools/price-conversion', {
                amount,
                symbol: symbol.toUpperCase(),
                convert
            });
            return CoinMarketCapHelper.formatPriceConversion(response.data, convert.toUpperCase());
        } catch (error) {
            logger.error('CoinMarketCap getPriceConversion error:', error);
            throw new ApiError(500, 'Failed to convert price');
        }
    }
}

export default new CoinMarketCapService();