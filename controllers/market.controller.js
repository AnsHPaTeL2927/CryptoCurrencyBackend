
import { marketService } from '../services/market.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

export const marketController = {
  // Market Overview
  getMarketOverview: catchAsync(async (req, res) => {
    const overview = await marketService.getMarketOverview();
    res.json(overview);
  }),

  // getGlobalData: catchAsync(async (req, res) => {
  //   const globalData = await marketService.getGlobalData();
  //   res.json(globalData);
  // }),

  // Price Routes
  getCurrentPrices: catchAsync(async (req, res) => {
    const { coins = '' } = req.query;
    const prices = await marketService.getCurrentPrices(coins.split(','));
    res.json(prices);
  }),

  // getCoinPrice: catchAsync(async (req, res) => {
  //   const { coinId } = req.params;
  //   const price = await marketService.getCoinPrice(coinId);
  //   res.json(price);
  // }),

  getPriceHistory: catchAsync(async (req, res) => {
    const { coinId } = req.params;
    const { days = '30', interval = 'daily' } = req.query;
    const history = await marketService.getPriceHistory(coinId, days, interval);
    res.json(history);
  }),

  // getPriceRange: catchAsync(async (req, res) => {
  //   const { coinId } = req.params;
  //   const { from, to } = req.query;
  //   const priceRange = await marketService.getPriceRange(coinId, from, to);
  //   res.json(priceRange);
  // }),

  // Market Data
  // getCoins: catchAsync(async (req, res) => {
  //   const { page = 1, limit = 50 } = req.query;
  //   const coins = await marketService.getCoins(parseInt(page), parseInt(limit));
  //   res.json(coins);
  // }),

  // getCoinDetails: catchAsync(async (req, res) => {
  //   const { coinId } = req.params;
  //   const details = await marketService.getCoinDetails(coinId);
  //   res.json(details);
  // }),

  getTrendingCoins: catchAsync(async (req, res) => {
    const trending = await marketService.getTrendingCoins();
    res.json(trending);
  }),

  // getCategories: catchAsync(async (req, res) => {
  //   const categories = await marketService.getCategories();
  //   res.json(categories);
  // }),

  // getExchanges: catchAsync(async (req, res) => {
  //   const { page = 1, limit = 50 } = req.query;
  //   const exchanges = await marketService.getExchanges(parseInt(page), parseInt(limit));
  //   res.json(exchanges);
  // }),

  // Search
  // searchCoins: catchAsync(async (req, res) => {
  //   const { query } = req.query;
  //   if (!query) {
  //     throw new ApiError(400, 'Search query is required');
  //   }
  //   const results = await marketService.searchCoins(query);
  //   res.json(results);
  // })
};