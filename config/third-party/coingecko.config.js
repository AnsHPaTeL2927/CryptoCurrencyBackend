// controllers/market/coincap.controller.js
import catchAsync from '../../utils/catchAsync.js';
import { coinCapAPI } from '../../integrations/coincap/api.js';
import { ApiError } from '../../utils/ApiError.js';

export const coincapController = {
  getAssets: catchAsync(async (req, res) => {
    const assets = await coinCapAPI.getAssets();
    res.json(assets);
  }),

  getAssetHistory: catchAsync(async (req, res) => {
    const { assetId } = req.params;
    const { interval = 'd1' } = req.query;
    const history = await coinCapAPI.getAssetHistory(assetId, interval);
    res.json(history);
  })
};