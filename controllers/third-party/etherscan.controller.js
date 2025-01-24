import { EtherscanService } from '../../services/third-party/etherscan.service.js';
import { WebSocketService } from '../../services/websocket/websocket.service.js';
import { RedisService } from '../../services/redis/redis.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';

export class EtherScanController {
   static getEthBalance = catchAsync(async (req, res) => {
       const { address } = req.params;
       if (!address) throw new ApiError('Address is required', 400);

       const cacheKey = `eth:balance:${address}`;
       const cachedBalance = await RedisService.get(cacheKey);
       if (cachedBalance) return res.json({ status: 'success', data: cachedBalance });

       const balance = await EtherscanService.getBalance(address);
       await RedisService.set(cacheKey, balance, 60);
       await WebSocketService.emitBalanceUpdate('eth', address, balance);

       res.json({ status: 'success', data: balance, timestamp: new Date() });
   });

   static getEthTransactions = catchAsync(async (req, res) => {
       const { address } = req.params;
       const { page = 1, offset = 10, startBlock, endBlock } = req.query;
       if (!address) throw new ApiError('Address is required', 400);

       const cacheKey = `eth:txs:${address}:${page}:${offset}:${startBlock}:${endBlock}`;
       const cachedTxs = await RedisService.get(cacheKey);
       if (cachedTxs) return res.json({ status: 'success', data: cachedTxs });

       const txs = await EtherscanService.getTransactions(address, page, offset, startBlock, endBlock);
       await RedisService.set(cacheKey, txs, 30);

       res.json({
           status: 'success', 
           data: txs,
           pagination: { page: parseInt(page), offset: parseInt(offset) },
           timestamp: new Date()
       });
   });

   static getGasOracle = catchAsync(async (req, res) => {
       const cacheKey = 'eth:gas';
       const cachedGas = await RedisService.get(cacheKey);
       if (cachedGas) return res.json({ status: 'success', data: cachedGas });

       const gasPrice = await EtherscanService.getGasOracle();
       await RedisService.set(cacheKey, gasPrice, 30);
       await WebSocketService.emitGasUpdate(gasPrice);

       res.json({ status: 'success', data: gasPrice, timestamp: new Date() });
   });

   static getInternalTransactions = catchAsync(async (req, res) => {
       const { address } = req.params;
       const { page = 1, offset = 10 } = req.query;
       if (!address) throw new ApiError('Address is required', 400);

       const cacheKey = `eth:internal:${address}:${page}:${offset}`;
       const cachedTxs = await RedisService.get(cacheKey);
       if (cachedTxs) return res.json({ status: 'success', data: cachedTxs });

       const txs = await EtherscanService.getInternalTransactions(address, page, offset);
       await RedisService.set(cacheKey, txs, 30);

       res.json({
           status: 'success',
           data: txs,
           pagination: { page: parseInt(page), offset: parseInt(offset) },
           timestamp: new Date()
       });
   });

   static getTokenTransfers = catchAsync(async (req, res) => {
       const { address } = req.params;
       const { contractAddress, page = 1, offset = 10 } = req.query;
       if (!address) throw new ApiError('Address is required', 400);

       const cacheKey = `eth:transfers:${address}:${contractAddress}:${page}:${offset}`;
       const cachedTransfers = await RedisService.get(cacheKey);
       if (cachedTransfers) return res.json({ status: 'success', data: cachedTransfers });

       const transfers = await EtherscanService.getTokenTransfers(address, contractAddress, page, offset);
       await RedisService.set(cacheKey, transfers, 30);

       res.json({
           status: 'success',
           data: transfers,
           pagination: { page: parseInt(page), offset: parseInt(offset) },
           timestamp: new Date()
       });
   });

   static getBlockInfo = catchAsync(async (req, res) => {
       const { blockNumber } = req.params;
       if (!blockNumber) throw new ApiError('Block number is required', 400);

       const cacheKey = `eth:block:${blockNumber}`;
       const cachedInfo = await RedisService.get(cacheKey);
       if (cachedInfo) return res.json({ status: 'success', data: cachedInfo });

       const info = await EtherscanService.getBlockInfo(blockNumber);
       await RedisService.set(cacheKey, info, 300);

       res.json({ status: 'success', data: info, timestamp: new Date() });
   });

   static getTokenInfo = catchAsync(async (req, res) => {
       const { contractAddress } = req.params;
       if (!contractAddress) throw new ApiError('Contract address is required', 400);

       const cacheKey = `eth:token:${contractAddress}`;
       const cachedInfo = await RedisService.get(cacheKey);
       if (cachedInfo) return res.json({ status: 'success', data: cachedInfo });

       const info = await EtherscanService.getTokenInfo(contractAddress);
       await RedisService.set(cacheKey, info, 3600);

       res.json({ status: 'success', data: info, timestamp: new Date() });
   });
}

export default EtherScanController;