import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { CryptoCompareController } from '../controllers/third-party/cryptoCompare.controller.js';
import { RateLimiter } from '../middleware/RateLimiter.middleware.js';
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
router.get('/market/price/current', RateLimiter, CryptoCompareController.getCurrentPrice);
router.get('/market/price/:symbol', RateLimiter, CryptoCompareController.getSymbolPrice); // symbol is BTC, ETH, BNB, etc.
router.get('/market/historical/:symbol', RateLimiter, CryptoCompareController.getHistoricalData);
router.get('/market/top-exchanges/:symbol', RateLimiter, CryptoCompareController.getTopExchanges);
router.get('/market/ohlcv/:symbol', RateLimiter, CryptoCompareController.getOHLCV);
router.get('/market/volume/:symbol', RateLimiter, CryptoCompareController.getVolume);
router.get('/news/latest', RateLimiter, CryptoCompareController.getLatestNews);
router.get('/news/categories', RateLimiter, CryptoCompareController.getNewsCategories);
router.get('/social/data/:symbol', RateLimiter, CryptoCompareController.getSocialData);
router.get('/market/analysis/:symbol', RateLimiter, CryptoCompareController.getMarketAnalysis);

// CoinCap Routes
router.get('/assets/list', RateLimiter, CoinCapController.getAllAssets);
router.get('/assets/details/:id', RateLimiter, CoinCapController.getAssetDetails);
router.get('/assets/history/:id', RateLimiter, CoinCapController.getAssetHistory);
router.get('/rates/exchange', RateLimiter, CoinCapController.getExchangeRates); // curreny like inr, yuan, pound as compare to usd
router.get('/exchanges/data', RateLimiter, CoinCapController.getExchangesData);
router.get('/markets/details', RateLimiter, CoinCapController.getMarketsDetails);
router.get('/candles/:exchange/:pair/:interval', RateLimiter, CoinCapController.getCandleData);

// CoinMarketCap Routes
router.get('/cryptocurrency/listings', RateLimiter, CoinCapMarketController.getLatestListings);
router.get('/cryptocurrency/metadata/:symbol', RateLimiter, CoinCapMarketController.getCryptoMetadata);
router.get('/cryptocurrency/quotes/:symbol', RateLimiter, CoinCapMarketController.getCryptoQuotes);
router.get('/cryptocurrency/trending', RateLimiter, CoinCapMarketController.getTrendingCrypto); // not for use // pro version api - 403
router.get('/global-metrics', RateLimiter, CoinCapMarketController.getGlobalMetrics);
router.get('/cryptocurrency/categories', RateLimiter, CoinCapMarketController.getCryptoCategories);
router.get('/exchange/listings', RateLimiter, CoinCapMarketController.getExchangeListings); // not for use // pro version api - 403
router.get('/tools/price-conversion/:amount/:symbol/:convert', RateLimiter, CoinCapMarketController.getPriceConversion);

// Etherscan Routes
router.get('/eth/balance/:address', RateLimiter, EtherScanController.getEthBalance);
router.get('/eth/transactions/:address', RateLimiter, EtherScanController.getEthTransactions);
router.get('/eth/internal-transactions/:address', RateLimiter, EtherScanController.getInternalTransactions);
router.get('/eth/token-transfers/:address', RateLimiter, EtherScanController.getTokenTransfers);
router.get('/eth/gas-oracle', RateLimiter, EtherScanController.getGasOracle);
router.get('/eth/block/:blockNumber', RateLimiter, EtherScanController.getBlockInfo);
router.get('/eth/token/:contractAddress', RateLimiter, EtherScanController.getTokenInfo);  // not for use // pro version api - 403

// BSCScan Routes
router.get('/bsc/balance/:address', RateLimiter, BscScanController.getBscBalance);
router.get('/bsc/transactions/:address', RateLimiter, BscScanController.getBscTransactions);
router.get('/bsc/internal-transactions/:address', RateLimiter, BscScanController.getBscInternalTxs);
router.get('/bsc/bep20-transfers/:address', RateLimiter, BscScanController.getBEP20Transfers);
router.get('/bsc/token/:contractAddress', RateLimiter, BscScanController.getBEP20TokenInfo);
router.get('/bsc/abi/:contractAddress', RateLimiter, BscScanController.getContractABI);

// WebSocket Subscriptions
router.post('/ws/crypto/subscribe', authenticate, WebSocketController.subscribeCryptoStream);
router.post('/ws/trades/subscribe', authenticate, WebSocketController.subscribeTradesStream);
router.post('/ws/price/subscribe', authenticate, WebSocketController.subscribePriceStream);
router.post('/ws/unsubscribe/:streamId', authenticate, WebSocketController.unsubscribeStream);
router.get('/ws/subscriptions', authenticate, WebSocketController.getActiveSubscriptions);

// Combined Data Routes
router.get('/price/aggregated/:symbol', RateLimiter, CombinedController.getAggregatedPrice);
router.get('/market/summary/:symbol', RateLimiter, CombinedController.getMarketSummary);
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