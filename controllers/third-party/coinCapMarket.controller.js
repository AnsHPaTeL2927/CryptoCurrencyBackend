import { CoinMarketCapService } from '../../services/third-party/coinmarketcap.service.js';
import { WebSocketService } from '../../services/websocket/websocket.service.js';
import { RedisService } from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';

export class CoinCapMarketController {
   static getLatestListings = catchAsync(async (req, res) => {
       const { start = 1, limit = 100, convert = 'USD' } = req.query;
       const cacheKey = `cmc:listings:${start}:${limit}:${convert}`;

       const cachedListings = await RedisService.get(cacheKey);
       if (cachedListings) return res.json({ status: 'success', data: cachedListings });

       const listings = await CoinMarketCapService.getLatestListings(start, limit, convert);
       await RedisService.set(cacheKey, listings, 60);
       await WebSocketService.emitListingsUpdate(listings);

       res.json({
           status: 'success',
           data: listings,
           pagination: { start, limit },
           timestamp: new Date()
       });
   });

   static getCryptoQuotes = catchAsync(async (req, res) => {
       const { symbol } = req.params;
       if (!symbol) throw new ApiError('Symbol is required', 400);

       const cacheKey = `cmc:quotes:${symbol}`;
       const cachedQuotes = await RedisService.get(cacheKey);
       if (cachedQuotes) return res.json({ status: 'success', data: cachedQuotes });

       const quotes = await CoinMarketCapService.getCryptoQuotes(symbol);
       await RedisService.set(cacheKey, quotes, 30);

       res.json({
           status: 'success',
           data: quotes,
           timestamp: new Date()
       });
   });

   static getGlobalMetrics = catchAsync(async (req, res) => {
       const cacheKey = 'cmc:global:metrics';
       const cachedMetrics = await RedisService.get(cacheKey);
       if (cachedMetrics) return res.json({ status: 'success', data: cachedMetrics });

       const metrics = await CoinMarketCapService.getGlobalMetrics();
       await RedisService.set(cacheKey, metrics, 300);

       res.json({
           status: 'success',
           data: metrics,
           timestamp: new Date()
       });
   });

   static getCryptoMetadata = catchAsync(async (req, res) => {
       const { symbol } = req.query;
       if (!symbol) throw new ApiError('Symbol is required', 400);

       const cacheKey = `cmc:metadata:${symbol}`;
       const cachedMetadata = await RedisService.get(cacheKey);
       if (cachedMetadata) return res.json({ status: 'success', data: cachedMetadata });

       const metadata = await CoinMarketCapService.getCryptoMetadata(symbol);
       await RedisService.set(cacheKey, metadata, 3600);

       res.json({
           status: 'success',
           data: metadata,
           timestamp: new Date()
       });
   });

   static getTrendingCrypto = catchAsync(async (req, res) => {
       const cacheKey = 'cmc:trending';
       const cachedTrending = await RedisService.get(cacheKey);
       if (cachedTrending) return res.json({ status: 'success', data: cachedTrending });

       const trending = await CoinMarketCapService.getTrendingCrypto();
       await RedisService.set(cacheKey, trending, 300);

       res.json({
           status: 'success',
           data: trending,
           timestamp: new Date()
       });
   });

   static getCryptoCategories = catchAsync(async (req, res) => {
       const cacheKey = 'cmc:categories';
       const cachedCategories = await RedisService.get(cacheKey);
       if (cachedCategories) return res.json({ status: 'success', data: cachedCategories });

       const categories = await CoinMarketCapService.getCryptoCategories();
       await RedisService.set(cacheKey, categories, 3600);

       res.json({
           status: 'success',
           data: categories,
           timestamp: new Date()
       });
   });

   static getExchangeListings = catchAsync(async (req, res) => {
       const { start = 1, limit = 100 } = req.query;
       const cacheKey = `cmc:exchanges:${start}:${limit}`;

       const cachedExchanges = await RedisService.get(cacheKey);
       if (cachedExchanges) return res.json({ status: 'success', data: cachedExchanges });

       const exchanges = await CoinMarketCapService.getExchangeListings(start, limit);
       await RedisService.set(cacheKey, exchanges, 300);

       res.json({
           status: 'success',
           data: exchanges,
           pagination: { start, limit },
           timestamp: new Date()
       });
   });

   static getPriceConversion = catchAsync(async (req, res) => {
       const { amount, symbol, convert = 'USD' } = req.query;
       if (!amount || !symbol) throw new ApiError('Amount and symbol are required', 400);

       const cacheKey = `cmc:convert:${amount}:${symbol}:${convert}`;
       const cachedConversion = await RedisService.get(cacheKey);
       if (cachedConversion) return res.json({ status: 'success', data: cachedConversion });

       const conversion = await CoinMarketCapService.getPriceConversion(amount, symbol, convert);
       await RedisService.set(cacheKey, conversion, 60);

       res.json({
           status: 'success',
           data: conversion,
           params: { amount, symbol, convert },
           timestamp: new Date()
       });
   });
}

export default CoinCapMarketController;