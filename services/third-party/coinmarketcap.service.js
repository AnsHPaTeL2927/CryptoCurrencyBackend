// services/third-party/coinmarketcap.service.js
import axios from 'axios';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class CoinMarketCapService {
    constructor() {
        this.baseUrl = environment.coinmarketcap.baseUrl;
        this.apiKey = environment.coinmarketcap.apiKey;
    }

    async getLatestListings(start = 1, limit = 100, convert = 'USD') {
        try {
            const response = await this.makeRequest('/cryptocurrency/listings/latest', {
                start,
                limit,
                convert
            });
            return this.formatListings(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getLatestListings error:', error);
            throw new ApiError(500, 'Failed to fetch latest listings');
        }
    }

    async getCryptoMetadata(symbol) {
        try {
            const response = await this.makeRequest('/cryptocurrency/info', {
                symbol: symbol.toUpperCase()
            });
            return this.formatMetadata(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoMetadata error:', error);
            throw new ApiError(500, 'Failed to fetch crypto metadata');
        }
    }

    async getCryptoQuotes(symbol) {
        try {
            const response = await this.makeRequest('/cryptocurrency/quotes/latest', {
                symbol: symbol.toUpperCase()
            });
            return this.formatQuotes(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoQuotes error:', error);
            throw new ApiError(500, 'Failed to fetch crypto quotes');
        }
    }

    async getTrendingCrypto() {
        try {
            const response = await this.makeRequest('/cryptocurrency/trending/latest');
            return this.formatTrending(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getTrendingCrypto error:', error);
            throw new ApiError(500, 'Failed to fetch trending cryptocurrencies');
        }
    }

    async getGlobalMetrics() {
        try {
            const response = await this.makeRequest('/global-metrics/quotes/latest');
            return this.formatGlobalMetrics(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getGlobalMetrics error:', error);
            throw new ApiError(500, 'Failed to fetch global metrics');
        }
    }

    async getCryptoCategories() {
        try {
            const response = await this.makeRequest('/cryptocurrency/categories');
            return this.formatCategories(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getCryptoCategories error:', error);
            throw new ApiError(500, 'Failed to fetch crypto categories');
        }
    }

    async getExchangeListings(start = 1, limit = 100) {
        try {
            const response = await this.makeRequest('/exchange/listings/latest', {
                start,
                limit
            });
            return this.formatExchangeListings(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getExchangeListings error:', error);
            throw new ApiError(500, 'Failed to fetch exchange listings');
        }
    }

    async getPriceConversion(amount, symbol, convert = 'USD') {
        try {
            const response = await this.makeRequest('/tools/price-conversion', {
                amount,
                symbol: symbol.toUpperCase(),
                convert
            });
            return this.formatPriceConversion(response.data);
        } catch (error) {
            logger.error('CoinMarketCap getPriceConversion error:', error);
            throw new ApiError(500, 'Failed to convert price');
        }
    }

    private async makeRequest(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params,
                headers: {
                    'X-CMC_PRO_API_KEY': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            throw new ApiError(error.response?.status || 500, error.message);
        }
    }

    private formatListings(data) {
        return data.map(listing => ({
            id: listing.id,
            name: listing.name,
            symbol: listing.symbol,
            slug: listing.slug,
            cmc_rank: listing.cmc_rank,
            market_cap: parseFloat(listing.quote.USD.market_cap),
            price: parseFloat(listing.quote.USD.price),
            volume_24h: parseFloat(listing.quote.USD.volume_24h),
            percent_change_24h: parseFloat(listing.quote.USD.percent_change_24h),
            last_updated: new Date(listing.last_updated)
        }));
    }

    private formatMetadata(data) {
        return Object.values(data).map(crypto => ({
            id: crypto.id,
            name: crypto.name,
            symbol: crypto.symbol,
            category: crypto.category,
            description: crypto.description,
            website: crypto.urls.website,
            explorer: crypto.urls.explorer,
            source_code: crypto.urls.source_code,
            technical_doc: crypto.urls.technical_doc,
            platform: crypto.platform,
            tags: crypto.tags,
            logo: crypto.logo
        }));
    }

    private formatQuotes(data) {
        return Object.values(data).map(quote => ({
            id: quote.id,
            name: quote.name,
            symbol: quote.symbol,
            price: parseFloat(quote.quote.USD.price),
            volume_24h: parseFloat(quote.quote.USD.volume_24h),
            market_cap: parseFloat(quote.quote.USD.market_cap),
            percent_change_1h: parseFloat(quote.quote.USD.percent_change_1h),
            percent_change_24h: parseFloat(quote.quote.USD.percent_change_24h),
            percent_change_7d: parseFloat(quote.quote.USD.percent_change_7d),
            last_updated: new Date(quote.last_updated)
        }));
    }

    private formatTrending(data) {
        return data.map(trend => ({
            id: trend.id,
            name: trend.name,
            symbol: trend.symbol,
            price: parseFloat(trend.quote.USD.price),
            percent_change_24h: parseFloat(trend.quote.USD.percent_change_24h),
            volume_24h: parseFloat(trend.quote.USD.volume_24h),
            market_cap: parseFloat(trend.quote.USD.market_cap),
            last_updated: new Date(trend.last_updated)
        }));
    }

    private formatGlobalMetrics(data) {
        const metrics = data.quote.USD;
        return {
            total_market_cap: parseFloat(metrics.total_market_cap),
            total_volume_24h: parseFloat(metrics.total_volume_24h),
            btc_dominance: parseFloat(data.btc_dominance),
            eth_dominance: parseFloat(data.eth_dominance),
            active_cryptocurrencies: data.total_cryptocurrencies,
            active_exchanges: data.active_exchanges,
            last_updated: new Date(data.last_updated)
        };
    }

    private formatCategories(data) {
        return data.map(category => ({
            id: category.id,
            name: category.name,
            title: category.title,
            description: category.description,
            num_tokens: category.num_tokens,
            avg_price_change: parseFloat(category.avg_price_change),
            market_cap: parseFloat(category.market_cap),
            volume_24h: parseFloat(category.volume_24h),
            last_updated: new Date(category.last_updated)
        }));
    }

    private formatExchangeListings(data) {
        return data.map(exchange => ({
            id: exchange.id,
            name: exchange.name,
            slug: exchange.slug,
            num_markets: exchange.num_markets,
            volume_24h: parseFloat(exchange.quote.USD.volume_24h),
            volume_7d: parseFloat(exchange.quote.USD.volume_7d),
            volume_30d: parseFloat(exchange.quote.USD.volume_30d),
            percent_change_24h: parseFloat(exchange.quote.USD.percent_change_24h),
            last_updated: new Date(exchange.last_updated)
        }));
    }

    private formatPriceConversion(data) {
        return {
            symbol: data.symbol,
            name: data.name,
            amount: parseFloat(data.amount),
            quote: {
                price: parseFloat(data.quote.USD.price),
                converted_amount: parseFloat(data.quote.USD.amount),
                last_updated: new Date(data.quote.USD.last_updated)
            }
        };
    }
}

export default new CoinMarketCapService();