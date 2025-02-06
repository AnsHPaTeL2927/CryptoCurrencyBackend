import SubscriptionService from './subscription.service.js';
import { EmitterService } from './emitter.service.js';
import { RoomService } from './room.service.js';
import StreamService from './stream.service.js';
import { ConnectionService } from './connection.service.js';

class WebSocketService {
    // Connection Management
    async handleConnection(socket) {
        await ConnectionService.handleConnection(socket);
    }

    async handleDisconnect(socket) {
        await ConnectionService.handleDisconnect(socket);
    }

    async disconnectUser(userId) {
        await ConnectionService.disconnectUser(userId);
    }

    // Subscription Methods
    async subscribeToCrypto(socket, userId, symbols, options) {
        return await SubscriptionService.subscribeToCrypto(socket, userId, symbols, options);
    }

    async subscribeToTrades(userId, pairs) {
        return await SubscriptionService.subscribeToTrades(userId, pairs);
    }

    async subscribeToPrices(userId, symbols) {
        return await SubscriptionService.subscribeToPrices(userId, symbols);
    }

    async subscribeToOrderBook(userId, symbol, depth) {
        return await SubscriptionService.subscribeToOrderBook(userId, symbol, depth);
    }

    async subscribeToMarket(userId, symbols) {
        await RoomService.subscribeToMarket(userId, symbols);
        return await StreamService.startMarketStream(symbols);
    }

    async subscribeToPortfolio(userId) {
        await RoomService.subscribeToPortfolioUpdates(userId);
        return await StreamService.startPortfolioStream(userId);
    }

    // Room Management
    async subscribeToAddress(userId, address, chain) {
        await RoomService.subscribeToAddress(userId, address, chain);
    }

    async subscribeToAsset(userId, assetId) {
        await RoomService.subscribeToAsset(userId, assetId);
    }

    async subscribeToPriceFeed(userId, symbol) {
        await RoomService.subscribeToPriceFeed(userId, symbol);
        return await StreamService.startPriceStream([symbol]);
    }

    // Stream Management
    async startStream(streamType, params) {
        switch (streamType) {
            case 'price':
                return await StreamService.startPriceStream(params.symbols, params.interval);
            case 'orderbook':
                return await StreamService.startOrderBookStream(params.symbol, params.depth, params.interval);
            case 'trades':
                return await StreamService.startTradeStream(params.pairs, params.interval);
            case 'market':
                return await StreamService.startMarketStream(params.markets, params.interval);
            case 'portfolio':
                return await StreamService.startPortfolioStream(params.userId, params.interval);
            case 'alerts':
                return await StreamService.startAlertStream(params.userId, params.alerts, params.interval);
            default:
                throw new Error(`Unknown stream type: ${streamType}`);
        }
    }

    async stopStream(streamId) {
        await StreamService.stopStream(streamId);
    }

    // Unsubscribe Methods
    async unsubscribe(userId, streamId) {
        await SubscriptionService.unsubscribe(userId, streamId);
    }

    async unsubscribeFromAddress(userId, address, chain) {
        await RoomService.unsubscribeFromAddress(userId, address, chain);
    }

    async unsubscribeFromMarket(userId, symbols) {
        await RoomService.unsubscribeFromMarket(userId, symbols);
    }

    // Status Methods
    async getActiveSubscriptions(userId) {
        return await SubscriptionService.getActiveSubscriptions(userId);
    }

    async getActiveStreams() {
        return await StreamService.getActiveStreams();
    }

    async getUserRooms(userId) {
        return await RoomService.getUserRooms(userId);
    }

    // Cache Related Methods
    async broadcastCacheUpdate(type, action) {
        await EmitterService.broadcastCacheUpdate(type, action);
    }

    async sendCacheStatus(userId, status) {
        await EmitterService.sendCacheStatus(userId, status);
    }

    async notifyCacheRefresh(type) {
        await EmitterService.notifyCacheRefresh(type);
    }

    // Chain Connection Methods
    async handleChainConnection(userId, chain) {
        await RoomService.handleChainConnection(userId, chain);
    }

    async handleChainDisconnection(userId, chain) {
        await RoomService.handleChainDisconnection(userId, chain);
    }

    // Cleanup Method
    async cleanup(socketId) {
        await SubscriptionService.cleanup(socketId);
        await StreamService.stopAllStreams();
    }
}

export default new WebSocketService();