import BscscanService from '../../services/third-party/bscscan.service.js';
import WebSocketService from '../../services/websocket/websocket.service.js';
import RedisService from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { EmitterService } from '../../services/websocket/emitter.service.js';

export class BscScanController {
    static getBscBalance = catchAsync(async (req, res) => {
        const { address } = req.params;
        if (!address) throw new ApiError('Address is required', 400);

        const cacheKey = `bsc:balance:${address}`;
        const cachedBalance = await RedisService.get(cacheKey);
        if (cachedBalance) return res.json({ status: 'success', data: cachedBalance });

        const balance = await BscscanService.getBalance(address);
        await RedisService.set(cacheKey, balance, 60);
        await EmitterService.emitBalanceUpdate('bsc', address, balance);

        res.json({
            status: 'success',
            data: balance,
            timestamp: new Date()
        });
    });

    static getBscTransactions = catchAsync(async (req, res) => {
        const { address } = req.params;
        const { page = 1, offset = 10, startBlock, endBlock } = req.query;

        if (!address) throw new ApiError('Address is required', 400);

        const cacheKey = `bsc:txs:${address}:${page}:${offset}`;
        const cachedTxs = await RedisService.get(cacheKey);
        if (cachedTxs) return res.json({ status: 'success', data: cachedTxs });

        const txs = await BscscanService.getTransactions(address, {
            page: parseInt(page),
            offset: parseInt(offset),
            startBlock,
            endBlock
        });

        await RedisService.set(cacheKey, txs, 30);

        res.json({
            status: 'success',
            data: txs,
            pagination: {
                page: parseInt(page),
                offset: parseInt(offset),
                total: txs.length
            },
            timestamp: new Date()
        });
    });

    static getBscInternalTxs = catchAsync(async (req, res) => {
        const { address } = req.params;
        const { page = 1, offset = 10, startBlock, endBlock } = req.query;

        if (!address) throw new ApiError('Address is required', 400);

        const cacheKey = `bsc:internal:${address}:${page}:${offset}`;
        const cachedTxs = await RedisService.get(cacheKey);
        if (cachedTxs) return res.json({ status: 'success', data: cachedTxs });

        const txs = await BscscanService.getInternalTransactions(address, {
            page: parseInt(page),
            offset: parseInt(offset),
            startBlock,
            endBlock
        });

        await RedisService.set(cacheKey, txs, 30);

        res.json({
            status: 'success',
            data: txs,
            pagination: {
                page: parseInt(page),
                offset: parseInt(offset),
                total: txs.length
            },
            timestamp: new Date()
        });
    });

    static getBEP20Transfers = catchAsync(async (req, res) => {
        const { address } = req.params;
        const { contractAddress, page = 1, offset = 10 } = req.query;

        if (!address) throw new ApiError('Address is required', 400);

        const cacheKey = `bsc:bep20:${address}:${contractAddress}:${page}:${offset}`;
        const cachedTransfers = await RedisService.get(cacheKey);
        if (cachedTransfers) return res.json({ status: 'success', data: cachedTransfers });

        const transfers = await BscscanService.getBEP20Transfers(
            address,
            contractAddress,
            parseInt(page),
            parseInt(offset)
        );

        await RedisService.set(cacheKey, transfers, 30);

        res.json({
            status: 'success',
            data: transfers,
            pagination: {
                page: parseInt(page),
                offset: parseInt(offset),
                total: transfers.length
            },
            timestamp: new Date()
        });
    });

    static getBEP20TokenInfo = catchAsync(async (req, res) => {
        const { contractAddress } = req.params;
        if (!contractAddress) throw new ApiError('Contract address is required', 400);

        const cacheKey = `bsc:token:${contractAddress}`;
        const cachedInfo = await RedisService.get(cacheKey);
        if (cachedInfo) return res.json({ status: 'success', data: cachedInfo });

        const info = await BscscanService.getBEP20TokenInfo(contractAddress);
        await RedisService.set(cacheKey, info, 300);

        res.json({
            status: 'success',
            data: info,
            timestamp: new Date()
        });
    });

    static getContractABI = catchAsync(async (req, res) => {
        const { contractAddress } = req.params;
        if (!contractAddress) throw new ApiError('Contract address is required', 400);

        const cacheKey = `bsc:abi:${contractAddress}`;
        const cachedABI = await RedisService.get(cacheKey);
        if (cachedABI) return res.json({ status: 'success', data: cachedABI });

        const abi = await BscscanService.getContractABI(contractAddress);
        await RedisService.set(cacheKey, abi, 3600);

        res.json({
            status: 'success',
            data: abi,
            timestamp: new Date()
        });
    });
}

export default BscScanController;