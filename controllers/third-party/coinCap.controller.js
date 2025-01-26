import CoinCapService from '../../services/third-party/coincap.service.js';
import WebSocketService from '../../services/websocket/websocket.service.js';
import RedisService from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';

export class CoinCapController {
    static getAllAssets = catchAsync(async (req, res) => {
        const { limit = 100, offset = 0 } = req.query;
        const cacheKey = `coincap:assets:${limit}:${offset}`;

        const cachedAssets = await RedisService.get(cacheKey);
        if (cachedAssets) return res.json({ status: 'success', data: cachedAssets });

        const assets = await CoinCapService.getAllAssets(limit, offset);
        await RedisService.set(cacheKey, assets, 60);

        res.json({
            status: 'success',
            data: assets,
            pagination: { limit, offset, total: assets.length },
            timestamp: new Date()
        });
    });

    static getAssetDetails = catchAsync(async (req, res) => {
        const { id } = req.params;
        if (!id) throw new ApiError('Asset ID is required', 400);

        const cacheKey = `coincap:asset:${id}`;
        const cachedAsset = await RedisService.get(cacheKey);
        if (cachedAsset) return res.json({ status: 'success', data: cachedAsset });

        const asset = await CoinCapService.getAssetDetails(id);
        await RedisService.set(cacheKey, asset, 30);
        await WebSocketService.emitAssetUpdate(id, asset);

        res.json({
            status: 'success',
            data: asset,
            timestamp: new Date()
        });
    });

    static getAssetHistory = catchAsync(async (req, res) => {
        const { id } = req.params;
        const { interval = '1d' } = req.query;
        if (!id) throw new ApiError('Asset ID is required', 400);

        const validIntervals = ['1m', '5m', '15m', '30m', '1h', '2h', '6h', '12h', '1d'];
        if (!validIntervals.includes(interval)) {
            throw new ApiError(`Invalid interval. Valid intervals are: ${validIntervals.join(', ')}`, 400);
        }

        const cacheKey = `coincap:history:${id}:${interval}`;
        const cachedHistory = await RedisService.get(cacheKey);
        if (cachedHistory) return res.json({ status: 'success', data: cachedHistory });

        const history = await CoinCapService.getAssetHistory(id, interval);
        await RedisService.set(cacheKey, history, 300);

        res.json({
            status: 'success',
            data: history,
            params: { id, interval },
            timestamp: new Date()
        });
    });

    static getExchangeRates = catchAsync(async (req, res) => {
        const cacheKey = 'coincap:rates';
        const cachedRates = await RedisService.get(cacheKey);
        if (cachedRates) return res.json({ status: 'success', data: cachedRates });

        const rates = await CoinCapService.getExchangeRates();
        await RedisService.set(cacheKey, rates, 60);

        res.json({
            status: 'success',
            data: rates,
            timestamp: new Date()
        });
    });

    static getExchangesData = catchAsync(async (req, res) => {
        const { limit = 100, offset = 0 } = req.query;
        const cacheKey = `coincap:exchanges:${limit}:${offset}`;

        const cachedExchanges = await RedisService.get(cacheKey);
        if (cachedExchanges) return res.json({ status: 'success', data: cachedExchanges });

        const exchanges = await CoinCapService.getExchangesData(limit, offset);
        await RedisService.set(cacheKey, exchanges, 300);

        res.json({
            status: 'success',
            data: exchanges,
            pagination: { limit, offset, total: exchanges.length },
            timestamp: new Date()
        });
    });

    static getMarketsDetails = catchAsync(async (req, res) => {
        const { baseId, quoteId, exchangeId } = req.query;
        const cacheKey = `coincap:markets:${baseId}:${quoteId}:${exchangeId}`;

        const cachedMarkets = await RedisService.get(cacheKey);
        if (cachedMarkets) return res.json({ status: 'success', data: cachedMarkets });

        const markets = await CoinCapService.getMarketsDetails(baseId, quoteId, exchangeId);
        await RedisService.set(cacheKey, markets, 60);

        res.json({
            status: 'success',
            data: markets,
            params: { baseId, quoteId, exchangeId },
            timestamp: new Date()
        });
    });

    static getCandleData = catchAsync(async (req, res) => {
        const { exchange, pair, interval } = req.params;
        const { start, end } = req.query;

        const validIntervals = ['1m', '5m', '15m', '30m', '1h', '2h', '6h', '12h', '1d'];
        if (!validIntervals.includes(interval)) {
            throw new ApiError(`Invalid interval. Valid intervals are: ${validIntervals.join(', ')}`, 400);
        }

        const cacheKey = `coincap:candles:${exchange}:${pair}:${interval}:${start}:${end}`;
        const cachedCandles = await RedisService.get(cacheKey);
        if (cachedCandles) return res.json({ status: 'success', data: cachedCandles });

        const candles = await CoinCapService.getCandleData(exchange, pair, interval, start, end);
        await RedisService.set(cacheKey, candles, 60);

        res.json({
            status: 'success',
            data: candles,
            params: { exchange, pair, interval, start, end },
            timestamp: new Date()
        });
    });
}

export default CoinCapController;