// services/third-party/cryptocompare.service.js
import axios from 'axios';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class CryptoCompareService {
    constructor() {
        this.baseUrl = environment.cryptocompare.baseUrl;
        this.apiKey = environment.cryptocompare.apiKey;
    }

    async getCurrentPrice() {
        try {
            const response = await this.makeRequest('/data/pricemultifull', {
                fsyms: 'BTC,ETH,BNB,XRP,ADA',  // Default top coins
                tsyms: 'USD'
            });
            return this.formatPriceData(response.RAW);
        } catch (error) {
            logger.error('CryptoCompare getCurrentPrice error:', error);
            throw new ApiError(500, 'Failed to fetch current prices');
        }
    }

    async getSymbolPrice(symbol) {
        try {
            const response = await this.makeRequest('/data/price', {
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
            const response = await this.makeRequest('/data/v2/histoday', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD',
                limit,
                aggregate
            });
            return this.formatHistoricalData(response.Data.Data);
        } catch (error) {
            logger.error('CryptoCompare getHistoricalData error:', error);
            throw new ApiError(500, 'Failed to fetch historical data');
        }
    }

    async getTopExchanges(symbol) {
        try {
            const response = await this.makeRequest('/data/top/exchanges', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD'
            });
            return this.formatExchangeData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getTopExchanges error:', error);
            throw new ApiError(500, 'Failed to fetch top exchanges');
        }
    }

    async getOHLCV(symbol, limit = 100, aggregate = 1) {
        try {
            const response = await this.makeRequest('/data/v2/histominute', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD',
                limit,
                aggregate
            });
            return this.formatOHLCVData(response.Data.Data);
        } catch (error) {
            logger.error('CryptoCompare getOHLCV error:', error);
            throw new ApiError(500, 'Failed to fetch OHLCV data');
        }
    }

    async getVolume(symbol) {
        try {
            const response = await this.makeRequest('/data/exchange/symbol/histoday', {
                fsym: symbol.toUpperCase(),
                tsym: 'USD'
            });
            return this.formatVolumeData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getVolume error:', error);
            throw new ApiError(500, 'Failed to fetch volume data');
        }
    }

    async getLatestNews(categories = '', limit = 20) {
        try {
            const response = await this.makeRequest('/data/v2/news/', {
                categories,
                lTs: Math.floor(Date.now() / 1000),
                lang: 'EN',
                sortOrder: 'latest',
                limit
            });
            return this.formatNewsData(response.Data);
        } catch (error) {
            logger.error('CryptoCompare getLatestNews error:', error);
            throw new ApiError(500, 'Failed to fetch latest news');
        }
    }

    async getNewsCategories() {
        try {
            const response = await this.makeRequest('/data/news/categories');
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
            const response = await this.makeRequest('/data/social/coin/latest', {
                fsym: symbol.toUpperCase()
            });
            return this.formatSocialData(response.Data);
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

    private async makeRequest(endpoint, params = {}) {
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

    private formatPriceData(data) {
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

    private formatHistoricalData(data) {
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

    private formatExchangeData(data) {
        return data.map(exchange => ({
            exchange: exchange.exchange,
            volume24h: exchange.volume24h,
            volume24hTo: exchange.volume24hTo,
            price: exchange.price,
            lastUpdate: new Date(exchange.lastUpdate * 1000)
        }));
    }

    private formatOHLCVData(data) {
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

    private formatVolumeData(data) {
        return data.map(item => ({
            time: new Date(item.time * 1000),
            volume: item.volume,
            volumeFrom: item.volumefrom,
            volumeTo: item.volumeto
        }));
    }

    private formatNewsData(data) {
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

    private formatSocialData(data) {
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

export default new CryptoCompareService();