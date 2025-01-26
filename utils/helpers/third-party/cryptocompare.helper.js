import axios from 'axios';
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";
export class CryptoCompareHelper {
    constructor() {
        this.baseUrl = environment.cryptocompare.baseUrl;
        this.apiKey = environment.cryptocompare.apiKey;
    }

    static async makeRequest(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params,
                headers: {
                    'Authorization': `Apikey ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            throw new ApiError(error.response?.status || 500, error.message);
        }
    }

    static formatPriceData(data) {
        return Object.entries(data).reduce((acc, [symbol, value]) => {
            acc[symbol] = {
                USD: {
                    price: value.USD.PRICE,
                    high24h: value.USD.HIGH24HOUR,
                    low24h: value.USD.LOW24HOUR,
                    volume24h: value.USD.VOLUME24HOUR,
                    change24h: value.USD.CHANGE24HOUR,
                    changePercent24h: value.USD.CHANGEPCT24HOUR,
                    lastUpdate: new Date(value.USD.LASTUPDATE * 1000)
                }
            };
            return acc;
        }, {});
    }

    static formatHistoricalData(data) {
        return data.map(item => ({
            time: new Date(item.time * 1000),
            close: item.close,
            high: item.high,
            low: item.low,
            open: item.open,
            volumeFrom: item.volumefrom,
            volumeTo: item.volumeto
        }));
    }

    static formatExchangeData(data) {
        return data.map(exchange => ({
            exchange: exchange.exchange,
            volume24h: exchange.volume24h,
            volume24hTo: exchange.volume24hTo,
            price: exchange.price,
            lastUpdate: new Date(exchange.lastUpdate * 1000)
        }));
    }

    static formatOHLCVData(data) {
        return data.map(item => ({
            time: new Date(item.time * 1000),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volumeFrom: item.volumefrom,
            volumeTo: item.volumeto
        }));
    }

    static formatVolumeData(data) {
        return data.map(item => ({
            time: new Date(item.time * 1000),
            volume: item.volume,
            volumeFrom: item.volumefrom,
            volumeTo: item.volumeto
        }));
    }

    static formatNewsData(data) {
        return data.map(news => ({
            id: news.id,
            title: news.title,
            body: news.body,
            categories: news.categories,
            url: news.url,
            source: news.source,
            publishedAt: new Date(news.published_on * 1000),
            imageUrl: news.imageurl
        }));
    }

    static formatSocialData(data) {
        return {
            reddit: {
                posts: data.Reddit?.posts || 0,
                comments: data.Reddit?.comments || 0,
                followers: data.Reddit?.followers || 0,
                activeUsers: data.Reddit?.active_users || 0
            },
            twitter: {
                followers: data.Twitter?.followers || 0,
                statuses: data.Twitter?.statuses || 0,
                following: data.Twitter?.following || 0
            },
            github: {
                stars: data.GitHub?.stars || 0,
                forks: data.GitHub?.forks || 0,
                subscribers: data.GitHub?.subscribers || 0
            },
            technicalData: {
                sentiment: data.sentiment,
                price: data.price,
                volume: data.volume
            },
            lastUpdate: new Date()
        };
    }
}