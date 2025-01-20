// controllers/market/coingecko.controller.js
import catchAsync from '../../utils/catchAsync.js';
import { coinGeckoAPI } from '../../integrations/coingecko/api.js';
import { ApiError } from '../../utils/ApiError.js';

export const coingeckoController = {
  getPrice: catchAsync(async (req, res) => {
    const { ids, vsCurrency = 'usd' } = req.query;
    if (!ids) {
      throw new ApiError(400, 'Coin IDs are required');
    }
    const price = await coinGeckoAPI.getCurrentPrices(ids.split(','), vsCurrency);
    res.json(price);
  }),

  getCoinHistory: catchAsync(async (req, res) => {
    const { coinId } = req.params;
    const { days = 30 } = req.query;
    const history = await coinGeckoAPI.getCoinHistory(coinId, days);
    res.json(history);
  }),

  getTrending: catchAsync(async (req, res) => {
    const trending = await coinGeckoAPI.getTrending();
    res.json(trending);
  })
};