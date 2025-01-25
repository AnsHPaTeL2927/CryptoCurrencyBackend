import axios from 'axios';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class CoinCapService {
    constructor() {
        this.baseUrl = environment.coincap.baseUrl;
        this.apiKey = environment.coincap.apiKey;
    }

    async getAllAssets(limit = 100, offset = 0) {
        try {
            const response = await this.makeRequest('/assets', {
                limit,
                offset
            });
            return this.formatAssetList(response.data);
        } catch (error) {
            logger.error('CoinCap getAllAssets error:', error);
            throw new ApiError(500, 'Failed to fetch assets');
        }
    }

    async getAssetDetails(id) {
        try {
            const response = await this.makeRequest(`/assets/${id}`);
            return this.formatAssetDetails(response.data);
        } catch (error) {
            logger.error('CoinCap getAssetDetails error:', error);
            throw new ApiError(500, 'Failed to fetch asset details');
        }
    }

    async getAssetHistory(id, interval = '1d') {
        try {
            const validIntervals = ['m1', 'm5', 'm15', 'm30', 'h1', 'h2', 'h6', 'h12', 'd1'];
            if (!validIntervals.includes(interval)) {
                throw new ApiError(400, 'Invalid interval');
            }

            const response = await this.makeRequest(`/assets/${id}/history`, { interval });
            return this.formatAssetHistory(response.data);
        } catch (error) {
            logger.error('CoinCap getAssetHistory error:', error);
            throw new ApiError(500, 'Failed to fetch asset history');
        }
    }

    async getExchangeRates() {
        try {
            const response = await this.makeRequest('/rates');
            return this.formatExchangeRates(response.data);
        } catch (error) {
            logger.error('CoinCap getExchangeRates error:', error);
            throw new ApiError(500, 'Failed to fetch exchange rates');
        }
    }

    async getExchangesData(limit = 100, offset = 0) {
        try {
            const response = await this.makeRequest('/exchanges', {
                limit,
                offset
            });
            return this.formatExchangeData(response.data);
        } catch (error) {
            logger.error('CoinCap getExchangesData error:', error);
            throw new ApiError(500, 'Failed to fetch exchanges data');
        }
    }

    async getMarketsDetails(baseId, quoteId, exchangeId) {
        try {
            const params = {};
            if (baseId) params.baseId = baseId;
            if (quoteId) params.quoteId = quoteId;
            if (exchangeId) params.exchangeId = exchangeId;

            const response = await this.makeRequest('/markets', params);
            return this.formatMarketDetails(response.data);
        } catch (error) {
            logger.error('CoinCap getMarketsDetails error:', error);
            throw new ApiError(500, 'Failed to fetch market details');
        }
    }

    async getCandleData(exchange, pair, interval, start, end) {
        try {
            const response = await this.makeRequest('/candles', {
                exchange,
                interval,
                baseId: pair.split('-')[0],
                quoteId: pair.split('-')[1],
                start,
                end
            });
            return this.formatCandleData(response.data);
        } catch (error) {
            logger.error('CoinCap getCandleData error:', error);
            throw new ApiError(500, 'Failed to fetch candle data');
        }
    }

    private async makeRequest(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            throw new ApiError(error.response?.status || 500, error.message);
        }
    }

    private formatAssetList(assets) {
        return assets.map(asset => ({
            id: asset.id,
            rank: parseInt(asset.rank),
            symbol: asset.symbol,
            name: asset.name,
            supply: parseFloat(asset.supply),
            maxSupply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
            marketCapUsd: parseFloat(asset.marketCapUsd),
            volumeUsd24Hr: parseFloat(asset.volumeUsd24Hr),
            priceUsd: parseFloat(asset.priceUsd),
            changePercent24Hr: parseFloat(asset.changePercent24Hr),
            vwap24Hr: asset.vwap24Hr ? parseFloat(asset.vwap24Hr) : null
        }));
    }

    private formatAssetDetails(asset) {
        return {
            id: asset.id,
            rank: parseInt(asset.rank),
            symbol: asset.symbol,
            name: asset.name,
            supply: parseFloat(asset.supply),
            maxSupply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
            marketCapUsd: parseFloat(asset.marketCapUsd),
            volumeUsd24Hr: parseFloat(asset.volumeUsd24Hr),
            priceUsd: parseFloat(asset.priceUsd),
            changePercent24Hr: parseFloat(asset.changePercent24Hr),
            vwap24Hr: asset.vwap24Hr ? parseFloat(asset.vwap24Hr) : null,
            explorer: asset.explorer
        };
    }

    private formatAssetHistory(history) {
        return history.map(point => ({
            priceUsd: parseFloat(point.priceUsd),
            time: new Date(point.time),
            circulatingSupply: parseFloat(point.circulatingSupply),
            date: point.date
        }));
    }

    private formatExchangeRates(rates) {
        return rates.map(rate => ({
            id: rate.id,
            symbol: rate.symbol,
            currencySymbol: rate.currencySymbol,
            rateUsd: parseFloat(rate.rateUsd),
            type: rate.type
        }));
    }

    private formatExchangeData(exchanges) {
        return exchanges.map(exchange => ({
            id: exchange.id,
            name: exchange.name,
            rank: parseInt(exchange.rank),
            percentTotalVolume: parseFloat(exchange.percentTotalVolume),
            volumeUsd: parseFloat(exchange.volumeUsd),
            tradingPairs: parseInt(exchange.tradingPairs),
            socket: exchange.socket,
            exchangeUrl: exchange.exchangeUrl,
            updated: new Date(exchange.updated)
        }));
    }

    private formatMarketDetails(markets) {
        return markets.map(market => ({
            exchangeId: market.exchangeId,
            baseId: market.baseId,
            quoteId: market.quoteId,
            baseSymbol: market.baseSymbol,
            quoteSymbol: market.quoteSymbol,
            volumeUsd24Hr: parseFloat(market.volumeUsd24Hr),
            priceUsd: parseFloat(market.priceUsd),
            volumePercent: parseFloat(market.volumePercent)
        }));
    }

    private formatCandleData(candles) {
        return candles.map(candle => ({
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
            period: new Date(candle.period)
        }));
    }
}

export default new CoinCapService();