import CryptoCompareService from '../../services/third-party/cryptocompare.service.js';
import RedisService from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import WebSocketService from '../../services/websocket/websocket.service.js';

export class CryptoCompareController {
    static getCurrentPrice = catchAsync(async (req, res) => {
        const cacheKey = 'cryptocompare:prices:current';
        const cachedPrices = await RedisService.get(cacheKey);
        if (cachedPrices) return res.json({ status: 'success', data: cachedPrices });

        const prices = await CryptoCompareService.getCurrentPrice();
        await RedisService.set(cacheKey, prices, 30);
        Object.entries(prices).forEach(([symbol, data]) => {
            WebSocketService.emitPriceUpdate(symbol, data);
        });

        res.json({
            status: 'success',
            data: prices,
            timestamp: new Date()
        });
    });

    static getSymbolPrice = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:price:${symbol}`;
        const cachedPrice = await RedisService.get(cacheKey);
        if (cachedPrice) return res.json({ status: 'success', data: cachedPrice });

        const price = await CryptoCompareService.getSymbolPrice(symbol);
        await RedisService.set(cacheKey, price, 30);

        res.json({
            status: 'success',
            data: price,
            timestamp: new Date()
        });
    });

    static getHistoricalData = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { limit = 100, aggregate = 1 } = req.query;

        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:history:${symbol}:${limit}:${aggregate}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await CryptoCompareService.getHistoricalData(symbol, limit, aggregate);
        await RedisService.set(cacheKey, data, 300);

        res.json({
            status: 'success',
            data,
            params: { symbol, limit, aggregate },
            timestamp: new Date()
        });
    });

    static getTopExchanges = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:exchanges:${symbol}`;
        const cachedExchanges = await RedisService.get(cacheKey);
        if (cachedExchanges) return res.json({ status: 'success', data: cachedExchanges });

        const exchanges = await CryptoCompareService.getTopExchanges(symbol);
        await RedisService.set(cacheKey, exchanges, 300);

        res.json({
            status: 'success',
            data: exchanges,
            timestamp: new Date()
        });
    });

    static getOHLCV = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { limit = 100, aggregate = 1 } = req.query;

        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:ohlcv:${symbol}:${limit}:${aggregate}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await CryptoCompareService.getOHLCV(symbol, limit, aggregate);
        await RedisService.set(cacheKey, data, 60);

        res.json({
            status: 'success',
            data,
            params: { symbol, limit, aggregate },
            timestamp: new Date()
        });
    });

    static getVolume = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:volume:${symbol}`;
        const cachedVolume = await RedisService.get(cacheKey);
        if (cachedVolume) return res.json({ status: 'success', data: cachedVolume });

        const volume = await CryptoCompareService.getVolume(symbol);
        await RedisService.set(cacheKey, volume, 60);

        res.json({
            status: 'success',
            data: volume,
            timestamp: new Date()
        });
    });

    static getLatestNews = catchAsync(async (req, res) => {
        const { categories, limit = 20 } = req.query;
        const cacheKey = `cryptocompare:news:${categories}:${limit}`;

        const cachedNews = await RedisService.get(cacheKey);
        if (cachedNews) return res.json({ status: 'success', data: cachedNews });

        const news = await CryptoCompareService.getLatestNews(categories, limit);
        await RedisService.set(cacheKey, news, 300);

        res.json({
            status: 'success',
            data: news,
            params: { categories, limit },
            timestamp: new Date()
        });
    });

    static getNewsCategories = catchAsync(async (req, res) => {
        const cacheKey = 'cryptocompare:news:categories';

        const cachedCategories = await RedisService.get(cacheKey);
        if (cachedCategories) return res.json({ status: 'success', data: cachedCategories });

        const categories = await CryptoCompareService.getNewsCategories();
        await RedisService.set(cacheKey, categories, 3600);

        res.json({
            status: 'success',
            data: categories,
            timestamp: new Date()
        });
    });

    static getSocialData = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:social:${symbol}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await CryptoCompareService.getSocialData(symbol);
        await RedisService.set(cacheKey, data, 300);

        res.json({
            status: 'success',
            data,
            timestamp: new Date()
        });
    });

    static getMarketAnalysis = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '24h' } = req.query;

        if (!symbol) throw new ApiError('Symbol is required', 400);

        const cacheKey = `cryptocompare:analysis:${symbol}:${period}`;
        const cachedAnalysis = await RedisService.get(cacheKey);
        if (cachedAnalysis) return res.json({ status: 'success', data: cachedAnalysis });

        const analysis = await CryptoCompareService.getMarketAnalysis(symbol, period);
        await RedisService.set(cacheKey, analysis, 300);

        res.json({
            status: 'success',
            data: analysis,
            params: { symbol, period },
            timestamp: new Date()
        });
    });
}

export default CryptoCompareController;