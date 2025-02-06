import logger from '../../utils/logger.js';

class WebSocketError {
    handleError(socket, error, context = '') {
        try {
            logger.error(`WebSocket Error [${context}]:`, error);

            const errorResponse = this.formatError(error);
            
            socket.emit('error', errorResponse);

            if (this.shouldDisconnect(error)) {
                socket.disconnect(true);
            }
        } catch (err) {
            logger.error('Error handler failure:', err);
        }
    }

    formatError(error) {
        return {
            message: error.message || 'An unexpected error occurred',
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        };
    }

    shouldDisconnect(error) {
        const criticalErrors = [
            'AUTHENTICATION_FAILED',
            'INVALID_TOKEN',
            'CONNECTION_LIMIT_EXCEEDED',
            'RATE_LIMIT_EXCEEDED'
        ];

        return criticalErrors.includes(error.code);
    }

    handleConnectionError(socket, error) {
        logger.error('Connection Error:', error);
        
        socket.emit('connection_error', {
            message: 'Failed to establish connection',
            code: error.code || 'CONNECTION_ERROR',
            timestamp: new Date().toISOString()
        });
    }

    handleSubscriptionError(socket, error, subscriptionData) {
        logger.error('Subscription Error:', error, 'Data:', subscriptionData);
        
        socket.emit('subscription_error', {
            message: error.message || 'Failed to create subscription',
            code: error.code || 'SUBSCRIPTION_ERROR',
            data: subscriptionData,
            timestamp: new Date().toISOString()
        });
    }

    handleStreamError(socket, error, streamId) {
        logger.error('Stream Error:', error, 'StreamId:', streamId);
        
        socket.emit('stream_error', {
            message: error.message || 'Stream error occurred',
            code: error.code || 'STREAM_ERROR',
            streamId,
            timestamp: new Date().toISOString()
        });
    }

    handleValidationError(socket, error, data) {
        logger.error('Validation Error:', error, 'Data:', data);
        
        socket.emit('validation_error', {
            message: error.message || 'Validation failed',
            code: 'VALIDATION_ERROR',
            data,
            timestamp: new Date().toISOString()
        });
    }

    handleRoomError(socket, error, roomData) {
        logger.error('Room Error:', error, 'Room:', roomData);
        
        socket.emit('room_error', {
            message: error.message || 'Room operation failed',
            code: error.code || 'ROOM_ERROR',
            room: roomData,
            timestamp: new Date().toISOString()
        });
    }
}

export default new WebSocketError();