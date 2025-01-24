// routes/external.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { CryptoCompareController } from '../controllers/third-party/cryptoCompare.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.middleware.js';
import CombinedController from '../controllers/combined.controller.js';
import { CoinCapController } from '../controllers/third-party/coinCap.controller.js';
import { CoinCapMarketController } from '../controllers/third-party/coinCapMarket.controller.js';
import { EtherScanController } from '../controllers/third-party/etherscan.controller.js';
import { BscScanController } from '../controllers/third-party/bscscan.controller.js';
import { WebSocketController } from '../controllers/websocket/websocket.controller.js';
import { CacheController } from '../controllers/cache/cache.controller.js';
import TechnicalController from '../controllers/technical.controller.js';

const router = express.Router();

// CryptoCompare Routes
router.get('/market/price/current', rateLimiter, CryptoCompareController.getCurrentPrice);
router.get('/market/price/:symbol', rateLimiter, CryptoCompareController.getSymbolPrice);
router.get('/market/historical/:symbol', rateLimiter, CryptoCompareController.getHistoricalData);
router.get('/market/top-exchanges/:symbol', rateLimiter, CryptoCompareController.getTopExchanges);
router.get('/market/ohlcv/:symbol', rateLimiter, CryptoCompareController.getOHLCV);
router.get('/market/volume/:symbol', rateLimiter, CryptoCompareController.getVolume);
router.get('/news/latest', rateLimiter, CryptoCompareController.getLatestNews);
router.get('/news/categories', rateLimiter, CryptoCompareController.getNewsCategories);
router.get('/social/data/:symbol', rateLimiter, CryptoCompareController.getSocialData);
router.get('/market/analysis/:symbol', rateLimiter, CryptoCompareController.getMarketAnalysis);

// CoinCap Routes
router.get('/assets/list', rateLimiter, CoinCapController.getAllAssets);
router.get('/assets/details/:id', rateLimiter, CoinCapController.getAssetDetails);
router.get('/assets/history/:id', rateLimiter, CoinCapController.getAssetHistory);
router.get('/rates/exchange', rateLimiter, CoinCapController.getExchangeRates);
router.get('/exchanges/data', rateLimiter, CoinCapController.getExchangesData);
router.get('/markets/details', rateLimiter, CoinCapController.getMarketsDetails);
router.get('/candles/:exchange/:pair/:interval', rateLimiter, CoinCapController.getCandleData);

// CoinMarketCap Routes
router.get('/cryptocurrency/listings', rateLimiter, CoinCapMarketController.getLatestListings);
router.get('/cryptocurrency/metadata', rateLimiter, CoinCapMarketController.getCryptoMetadata);
router.get('/cryptocurrency/quotes/:symbol', rateLimiter, CoinCapMarketController.getCryptoQuotes);
router.get('/cryptocurrency/trending', rateLimiter, CoinCapMarketController.getTrendingCrypto);
router.get('/global-metrics', rateLimiter, CoinCapMarketController.getGlobalMetrics);
router.get('/cryptocurrency/categories', rateLimiter, CoinCapMarketController.getCryptoCategories);
router.get('/exchange/listings', rateLimiter, CoinCapMarketController.getExchangeListings);
router.get('/tools/price-conversion', rateLimiter, CoinCapMarketController.getPriceConversion);

// Etherscan Routes
router.get('/eth/balance/:address', rateLimiter, EtherScanController.getEthBalance);
router.get('/eth/transactions/:address', rateLimiter, EtherScanController.getEthTransactions);
router.get('/eth/internal-transactions/:address', rateLimiter, EtherScanController.getInternalTransactions);
router.get('/eth/token-transfers/:address', rateLimiter, EtherScanController.getTokenTransfers);
router.get('/eth/gas-oracle', rateLimiter, EtherScanController.getGasOracle);
router.get('/eth/block/:blockNumber', rateLimiter, EtherScanController.getBlockInfo);
router.get('/eth/token/:contractAddress', rateLimiter, EtherScanController.getTokenInfo);

// BSCScan Routes
router.get('/bsc/balance/:address', rateLimiter, BscScanController.getBscBalance);
router.get('/bsc/transactions/:address', rateLimiter, BscScanController.getBscTransactions);
router.get('/bsc/internal-transactions/:address', rateLimiter, BscScanController.getBscInternalTxs);
router.get('/bsc/bep20-transfers/:address', rateLimiter, BscScanController.getBEP20Transfers);
router.get('/bsc/token/:contractAddress', rateLimiter, BscScanController.getBEP20TokenInfo);
router.get('/bsc/abi/:contractAddress', rateLimiter, BscScanController.getContractABI);

// WebSocket Subscriptions
router.post('/ws/crypto/subscribe', authenticate, WebSocketController.subscribeCryptoStream);
router.post('/ws/trades/subscribe', authenticate, WebSocketController.subscribeTradesStream);
router.post('/ws/price/subscribe', authenticate, WebSocketController.subscribePriceStream);
router.post('/ws/unsubscribe/:streamId', authenticate, WebSocketController.unsubscribeStream);
router.get('/ws/subscriptions', authenticate, WebSocketController.getActiveSubscriptions);

// Combined Data Routes
router.get('/price/aggregated/:symbol', rateLimiter, CombinedController.getAggregatedPrice);
router.get('/market/summary/:symbol', rateLimiter, CombinedController.getMarketSummary);
router.get('/analysis/comprehensive/:symbol', authenticate, CombinedController.getComprehensiveAnalysis);
router.get('/metrics/blockchain/:symbol', authenticate, CombinedController.getBlockchainMetrics);
router.get('/data/cross-exchange', authenticate, CombinedController.getCrossExchangeData);

// Cache Management
router.post('/cache/clear/:type', authenticate, CacheController.clearCache);
router.post('/cache/refresh/:type', authenticate, CacheController.refreshCache);
router.get('/cache/status', authenticate, CacheController.getCacheStatus);

// Add under Technical Analysis Routes section
router.get('/technical/indicators/:symbol', authenticate, TechnicalController.getTechnicalIndicators);
router.get('/technical/indicators/params', authenticate, TechnicalController.getIndicatorParameters); // Optional route for getting indicator parameters
router.get('/technical/arbitrage', authenticate, TechnicalController.getArbitrageOpportunities);
router.get('/technical/arbitrage/history', authenticate, TechnicalController.getArbitrageHistory); // Optional route for historical arbitrage data
export default router;