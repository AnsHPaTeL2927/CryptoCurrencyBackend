import axios from 'axios';
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";
export class CryptoCompareHelper {
    // constructor() {
    static baseUrl = environment.apis.cryptocompare.baseUrl;
    static apiKey = environment.apis.cryptocompare.apiKey;
    // }

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
        try {
            return Object.entries(data).reduce((acc, [symbol, currencyData]) => {
                acc[symbol] = {
                    USD: {
                        price: currencyData.USD.PRICE,
                        high24h: currencyData.USD.HIGH24HOUR,
                        low24h: currencyData.USD.LOW24HOUR,
                        volume24h: currencyData.USD.VOLUME24HOUR,
                        change24h: currencyData.USD.CHANGE24HOUR,
                        changePercent24h: currencyData.USD.CHANGEPCT24HOUR,
                        lastUpdate: new Date(currencyData.USD.LASTUPDATE * 1000)
                    }
                };
                return acc;
            }, {});
        } catch (error) {
            logger.error('Price data formatting error:', error);
            throw new ApiError(500, 'Error formatting price data');
        }
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
                points: data.Reddit?.Points || 0,
                subscribers: data.Reddit?.subscribers || 0,
                activeUsers: data.Reddit?.active_users || 0,
                postsPerHour: data.Reddit?.posts_per_hour || 0,
                postsPerDay: data.Reddit?.posts_per_day || 0,
                commentsPerHour: data.Reddit?.comments_per_hour || 0,
                commentsPerDay: data.Reddit?.comments_per_day || 0
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

    static formatPrice(data) {
        try {
            if (!data || !data.USD) {
                return null;
            }
            return parseFloat(data.USD);
        } catch (error) {
            logger.error('Error formatting price data:', error);
            return null;
        }
    }
    
    static formatMultiPriceData(data, exchange) {
        try {
            const formattedData = {};
            
            Object.entries(data).forEach(([symbol, priceData]) => {
                const price = this.formatPrice(priceData);
                if (price !== null) {
                    formattedData[symbol] = price;
                }
            });
    
            return formattedData;
        } catch (error) {
            logger.error('Error formatting multi price data:', error);
            return {};
        }
    }
}