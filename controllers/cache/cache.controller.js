import { WebSocketService } from '../../services/websocket/websocket.service.js';
import RedisService from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';

export class CacheController {
    static clearCache = catchAsync(async (req, res) => {
        const { type } = req.params;
        if (!type) throw new ApiError('Cache type is required', 400);

        const validTypes = ['market', 'user', 'trades', 'all'];
        if (!validTypes.includes(type)) {
            throw new ApiError('Invalid cache type. Valid types are: market, user, trades, all', 400);
        }

        await RedisService.clearCache(type);
        await WebSocketService.broadcastCacheUpdate(type, 'clear');

        res.json({
            status: 'success',
            message: `Cache ${type} cleared successfully`,
            timestamp: new Date()
        });
    });

    static refreshCache = catchAsync(async (req, res) => {
        const { type } = req.params;
        const { force } = req.query;

        if (!type) throw new ApiError('Cache type is required', 400);

        const validTypes = ['market', 'user', 'trades', 'all'];
        if (!validTypes.includes(type)) {
            throw new ApiError('Invalid cache type. Valid types are: market, user, trades, all', 400);
        }

        const refreshedData = await RedisService.refreshCache(type, force === 'true');
        await WebSocketService.broadcastCacheUpdate(type, 'refresh');

        res.json({
            status: 'success',
            message: `Cache ${type} refreshed successfully`,
            data: refreshedData,
            timestamp: new Date()
        });
    });

    static getCacheStatus = catchAsync(async (req, res) => {
        const { detailed } = req.query;
        const status = await RedisService.getCacheStatus(detailed === 'true');

        res.json({
            status: 'success',
            data: {
                ...status,
                uptime: await RedisService.getUptime(),
                memoryUsage: await RedisService.getMemoryUsage(),
                hitRate: await RedisService.getHitRate(),
                timestamp: new Date()
            }
        });
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