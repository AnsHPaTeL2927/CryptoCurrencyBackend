import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { CoinCapHelper } from '../../utils/helpers/third-party/coincap.helper.js';
import SymbolHelper from '../../utils/helpers/symbol.helper.js';

export class CoinCapService {
    async getAllAssets(limit = 100, offset = 0) {
        try {
            const response = await CoinCapHelper.makeRequest('/assets', {
                limit,
                offset
            });
            return CoinCapHelper.formatAssetList(response.data);
        } catch (error) {
            logger.error('CoinCap getAllAssets error:', error);
            throw new ApiError(500, 'Failed to fetch assets');
        }
    }

    async getAssetDetails(id) {
        try {
            const response = await CoinCapHelper.makeRequest(`/assets/${id}`);
            return CoinCapHelper.formatAssetDetails(response.data);
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

            const response = await CoinCapHelper.makeRequest(`/assets/${id}/history`, { interval });
            return CoinCapHelper.formatAssetHistory(response.data);
        } catch (error) {
            logger.error('CoinCap getAssetHistory error:', error);
            throw new ApiError(500, 'Failed to fetch asset history');
        }
    }

    async getExchangeRates() {
        try {
            const response = await CoinCapHelper.makeRequest('/rates');
            return CoinCapHelper.formatExchangeRates(response.data);
        } catch (error) {
            logger.error('CoinCap getExchangeRates error:', error);
            throw new ApiError(500, 'Failed to fetch exchange rates');
        }
    }

    async getExchangesData(limit = 100, offset = 0) {
        try {
            const response = await CoinCapHelper.makeRequest('/exchanges', {
                limit,
                offset
            });
            return CoinCapHelper.formatExchangeData(response.data);
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

            const response = await CoinCapHelper.makeRequest('/markets', params);
            return CoinCapHelper.formatMarketDetails(response.data);
        } catch (error) {
            logger.error('CoinCap getMarketsDetails error:', error);
            throw new ApiError(500, 'Failed to fetch market details');
        }
    }

    async getCandleData(exchange, pair, interval, start, end) {
        try {
            const response = await CoinCapHelper.makeRequest('/candles', {
                exchange,
                interval,
                baseId: pair.split('-')[0],
                quoteId: pair.split('-')[1],
                start,
                end
            });
            return CoinCapHelper.formatCandleData(response.data);
        } catch (error) {
            logger.error('CoinCap getCandleData error:', error);
            throw new ApiError(500, 'Failed to fetch candle data');
        }
    }

    async getAssetVolume(id) {
        try {
            const response = await CoinCapHelper.makeRequest(`/assets/${id}`);
            return {
                volume24h: response.data.volumeUsd24Hr,
                rank: response.data.rank
            };
        } catch (error) {
            throw new Error(`CoinCap volume error: ${error.message}`);
        }
    }

    async getAssetPrices(symbols) {
        try {
            // Convert trading symbols to CoinCap IDs
            const coinCapIds = SymbolHelper.convertToCoinCapIds(symbols);
            
            // Get prices for each asset
            const prices = await Promise.all(
                coinCapIds.map(async (id) => {
                    const response = await CoinCapHelper.makeRequest(`/assets/${id}`);
                    return {
                        id,
                        symbol: SymbolHelper.getTradingSymbol(id),
                        price: parseFloat(response.data.priceUsd)
                    };
                })
            );
    
            // Convert to object with trading symbols as keys
            return prices.reduce((acc, { symbol, price }) => {
                acc[symbol] = price;
                return acc;
            }, {});
        } catch (error) {
            logger.error('CoinCap getAssetPrices error:', error);
            throw new ApiError(500, 'Failed to fetch asset prices');
        }
    }
}

export default new CoinCapService();