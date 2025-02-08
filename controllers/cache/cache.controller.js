import WebSocketService from '../../services/websocket/websocket.service.js';
import RedisService from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class CacheController {
    static clearCache = catchAsync(async (req, res) => {
        const { type } = req.params;
        if (!type) {
            throw new ApiError(400, 'Cache type is required');
        }

        // Validate cache type
        const validTypes = ['market', 'user', 'trades', 'technical', 'all'];
        if (!validTypes.includes(type)) {
            throw new ApiError(400, `Invalid cache type. Valid types are: ${validTypes.join(', ')}`);
        }

        // Get stats before clearing
        const beforeStats = await RedisService.getCacheStats(type);

        // Clear cache
        const clearResult = await RedisService.clearCache(type);

        // Get stats after clearing
        const afterStats = await RedisService.getCacheStats(type);

        console.log(beforeStats, afterStats)

        // Notify connected clients
        await WebSocketService.broadcastCacheUpdate(type, {
            action: 'clear',
            keysCleared: clearResult.keysCleared,
            timestamp: new Date()
        });

        // Send response
        res.json({
            status: 'success',
            message: `Cache ${type} cleared successfully`,
            data: {
                type,
                keysCleared: clearResult.keysCleared,
                timestamp: new Date(),
                stats: {
                    before: beforeStats,
                    after: afterStats
                }
            }
        });
    });

    static refreshCache = catchAsync(async (req, res) => {
        const { type } = req.params;
        const { force = false, detailed = false } = req.query;

        if (!type) {
            throw new ApiError(400, 'Cache type is required');
        }

        const validTypes = ['market', 'user', 'trades', 'technical', 'all'];
        if (!validTypes.includes(type)) {
            throw new ApiError(400, `Invalid cache type. Valid types are: ${validTypes.join(', ')}`);
        }

        // Get cache statistics before refresh
        const beforeStats = await RedisService.getCacheStats(type);

        // Perform cache refresh
        const refreshResult = await RedisService.refreshCache(type, force === 'true');

        // Get cache statistics after refresh
        const afterStats = await RedisService.getCacheStats(type);

        // Notify connected clients via WebSocket
        await WebSocketService.broadcastCacheUpdate(type, {
            action: 'refresh',
            type,
            force: force === 'true',
            timestamp: new Date(),
            stats: {
                before: beforeStats,
                after: afterStats
            }
        });

        // Prepare response data
        const responseData = {
            type,
            force: force === 'true',
            refreshedAt: new Date(),
            keysAffected: refreshResult.keysAffected,
            stats: {
                beforeRefresh: beforeStats,
                afterRefresh: afterStats
            }
        };

        if (detailed === 'true') {
            responseData.details = refreshResult.details;
        }

        logger.info(`Cache refresh completed for type: ${type}`, {
            type,
            force,
            keysAffected: refreshResult.keysAffected
        });

        res.json({
            status: 'success',
            message: `Cache ${type} refreshed successfully`,
            data: responseData
        });
    });

    static getCacheStatus = catchAsync(async (req, res) => {
        try {
            const { detailed } = req.query;
            const status = await RedisService.getCacheStatus(detailed === 'true');
    
            return res.json({
                status: 'success',
                data: {
                    ...status,
                    uptime: await RedisService.getUptime(),
                    memoryUsage: await RedisService.getMemoryUsage(),
                    hitRate: await RedisService.getHitRate(),
                    timestamp: new Date()
                }
            });
        } catch (error) {
            throw new ApiError(500, 'Failed to get cache status');
        }
    });

    static getCacheMetrics = catchAsync(async (req, res) => {
        const metrics = await RedisService.getCacheMetrics();

        res.json({
            status: 'success',
            data: {
                ...metrics,
                timestamp: new Date()
            }
        });
    });
}

export default CacheController;