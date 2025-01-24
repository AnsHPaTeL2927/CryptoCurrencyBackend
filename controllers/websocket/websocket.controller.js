import { WebSocketService } from '../../services/websocket/websocket.service.js';
import { RedisService } from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';

export class WebSocketController {
    // Crypto Stream Subscriptions
    static subscribeCryptoStream = catchAsync(async (req, res) => {
        const { symbols, options = {} } = req.body;
        const userId = req.user._id;

        if (!symbols || !Array.isArray(symbols)) {
            throw new ApiError(400, 'Valid symbols array is required');
        }

        await WebSocketService.subscribeToCrypto(userId, symbols, options);
        res.json({ status: 'success', message: 'Subscribed to crypto stream' });
    });

    // Trade Stream Subscriptions
    static subscribeTradesStream = catchAsync(async (req, res) => {
        const { pairs, options = {} } = req.body;
        const userId = req.user._id;

        if (!pairs || !Array.isArray(pairs)) {
            throw new ApiError(400, 'Valid trading pairs array is required');
        }

        await WebSocketService.subscribeToTrades(userId, pairs, options);
        res.json({ status: 'success', message: 'Subscribed to trades stream' });
    });

    // Price Stream Subscriptions
    static subscribePriceStream = catchAsync(async (req, res) => {
        const { symbols, interval = '1m', options = {} } = req.body;
        const userId = req.user._id;

        if (!symbols || !Array.isArray(symbols)) {
            throw new ApiError(400, 'Valid symbols array is required');
        }

        await WebSocketService.subscribeToPrices(userId, symbols, interval, options);
        res.json({ status: 'success', message: 'Subscribed to price stream' });
    });

    // Market Stream Subscriptions
    static subscribeMarketStream = catchAsync(async (req, res) => {
        const { markets, options = {} } = req.body;
        const userId = req.user._id;

        if (!markets || !Array.isArray(markets)) {
            throw new ApiError(400, 'Valid markets array is required');
        }

        await WebSocketService.subscribeToMarkets(userId, markets, options);
        res.json({ status: 'success', message: 'Subscribed to market stream' });
    });

    // Order Book Stream
    static subscribeOrderBookStream = catchAsync(async (req, res) => {
        const { symbol, depth = 20, options = {} } = req.body;
        const userId = req.user._id;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        await WebSocketService.subscribeToOrderBook(userId, symbol, depth, options);
        res.json({ status: 'success', message: 'Subscribed to order book stream' });
    });

    // Unsubscribe from streams
    static unsubscribeStream = catchAsync(async (req, res) => {
        const { streamId } = req.params;
        const userId = req.user._id;

        if (!streamId) {
            throw new ApiError(400, 'Stream ID is required');
        }

        await WebSocketService.unsubscribe(userId, streamId);
        res.json({ status: 'success', message: 'Unsubscribed successfully' });
    });

    // Get active subscriptions
    static getActiveSubscriptions = catchAsync(async (req, res) => {
        const { type } = req.query;
        const userId = req.user._id;

        const subscriptions = await WebSocketService.getActiveSubscriptions(userId, type);
        res.json({
            status: 'success',
            data: subscriptions
        });
    });

    // Batch subscribe
    static batchSubscribe = catchAsync(async (req, res) => {
        const { subscriptions } = req.body;
        const userId = req.user._id;

        if (!subscriptions || !Array.isArray(subscriptions)) {
            throw new ApiError(400, 'Valid subscriptions array is required');
        }

        const results = await WebSocketService.batchSubscribe(userId, subscriptions);
        res.json({
            status: 'success',
            data: results
        });
    });

    // Batch unsubscribe
    static batchUnsubscribe = catchAsync(async (req, res) => {
        const { streamIds } = req.body;
        const userId = req.user._id;

        if (!streamIds || !Array.isArray(streamIds)) {
            throw new ApiError(400, 'Valid stream IDs array is required');
        }

        const results = await WebSocketService.batchUnsubscribe(userId, streamIds);
        res.json({
            status: 'success',
            data: results
        });
    });
}

export default WebSocketController;