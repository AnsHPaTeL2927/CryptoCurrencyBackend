import axios from "axios";
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";

export class CoinMarketCapHelper {
    // constructor() {
        static baseUrl = environment.apis.coinmarketcap.baseUrl;
        static apiKey = environment.apis.coinmarketcap.apiKey;
    // }

    static async makeRequest(endpoint, params = {}) {
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

    static formatListings(data) {
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

    static formatMetadata(data) {
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

    static formatQuotes(data) {
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

    static formatTrending(data) {
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

    static formatGlobalMetrics(data) {
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

    static formatCategories(data) {
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

    static formatExchangeListings(data) {
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

    static formatPriceConversion(data, convert) {
        return {
            symbol: data.symbol,
            name: data.name,
            amount: parseFloat(data.amount),
            quote: {
                price: parseFloat(data.quote[convert].price),
                converted_amount: parseFloat(data.quote[convert].amount),
                last_updated: new Date(data.quote[convert].last_updated)
            }
        };
    }
}