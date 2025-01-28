import axios from "axios";
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";
export class CoinCapHelper {
    // constructor() {
        static baseUrl = environment.apis.coincap.baseUrl;
        static apiKey = environment.apis.coincap.apiKey;
    // }

    static async makeRequest(endpoint, params = {}) {
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

    static formatAssetList(assets) {
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

    static formatAssetDetails(asset) {
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

    static formatAssetHistory(history) {
        return history.map(point => ({
            priceUsd: parseFloat(point.priceUsd),
            time: new Date(point.time),
            circulatingSupply: parseFloat(point.circulatingSupply),
            date: point.date
        }));
    }

    static formatExchangeRates(rates) {
        return rates.map(rate => ({
            id: rate.id,
            symbol: rate.symbol,
            currencySymbol: rate.currencySymbol,
            rateUsd: parseFloat(rate.rateUsd),
            type: rate.type
        }));
    }

    static formatExchangeData(exchanges) {
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

    static formatMarketDetails(markets) {
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

    static formatCandleData(candles) {
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