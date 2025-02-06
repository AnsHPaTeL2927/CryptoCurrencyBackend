
class WebSocketValidation {
    validateSubscriptionData(data) {
        if (!data) {
            throw new Error('Subscription data is required');
        }

        const validTypes = ['crypto', 'trades', 'prices', 'orderbook', 'portfolio', 'market'];
        if (!validTypes.includes(data.type)) {
            throw new Error('Invalid subscription type');
        }

        if (data.type === 'crypto' || data.type === 'prices') {
            if (!data.symbols || !Array.isArray(data.symbols) || data.symbols.length === 0) {
                throw new Error('Valid symbols array is required');
            }
        }

        if (data.type === 'orderbook') {
            if (!data.symbol) {
                throw new Error('Symbol is required for orderbook subscription');
            }
            if (data.depth && (!Number.isInteger(data.depth) || data.depth < 1)) {
                throw new Error('Valid depth value is required');
            }
        }

        return true;
    }

    validateStreamParameters(streamType, params) {
        switch(streamType) {
            case 'price':
                return this.validatePriceStreamParams(params);
            case 'orderbook':
                return this.validateOrderBookStreamParams(params);
            case 'trades':
                return this.validateTradeStreamParams(params);
            case 'market':
                return this.validateMarketStreamParams(params);
            case 'portfolio':
                return this.validatePortfolioStreamParams(params);
            case 'alerts':
                return this.validateAlertStreamParams(params);
            default:
                throw new Error(`Unknown stream type: ${streamType}`);
        }
    }

    validatePriceStreamParams(params) {
        if (!params.symbols || !Array.isArray(params.symbols) || params.symbols.length === 0) {
            throw new Error('Valid symbols array is required');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validateOrderBookStreamParams(params) {
        if (!params.symbol) {
            throw new Error('Symbol is required');
        }
        if (params.depth && (!Number.isInteger(params.depth) || params.depth < 1)) {
            throw new Error('Invalid depth value');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validateTradeStreamParams(params) {
        if (!params.pairs || !Array.isArray(params.pairs) || params.pairs.length === 0) {
            throw new Error('Valid pairs array is required');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validateMarketStreamParams(params) {
        if (!params.markets || !Array.isArray(params.markets) || params.markets.length === 0) {
            throw new Error('Valid markets array is required');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validatePortfolioStreamParams(params) {
        if (!params.userId) {
            throw new Error('User ID is required');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validateAlertStreamParams(params) {
        if (!params.userId) {
            throw new Error('User ID is required');
        }
        if (!params.alerts || !Array.isArray(params.alerts) || params.alerts.length === 0) {
            throw new Error('Valid alerts array is required');
        }
        if (params.interval && (!Number.isInteger(params.interval) || params.interval < 1000)) {
            throw new Error('Invalid interval value');
        }
        return true;
    }

    validateRoomName(room) {
        if (!room || typeof room !== 'string') {
            throw new Error('Valid room name is required');
        }
        if (room.length < 3 || room.length > 100) {
            throw new Error('Room name must be between 3 and 100 characters');
        }
        if (!/^[a-zA-Z0-9_\-:]+$/.test(room)) {
            throw new Error('Room name contains invalid characters');
        }
        return true;
    }
}

export default new WebSocketValidation();