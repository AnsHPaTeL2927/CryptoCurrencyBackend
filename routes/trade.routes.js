import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { TradeController } from '../controllers/trade.controller.js';

const router = express.Router();

// Trade Operations
router.post('/execute', authenticate, TradeController.executeTrade);
router.post('/close/:tradeId', authenticate, TradeController.closeTrade);
router.post('/update/:tradeId', authenticate, TradeController.updateTrade);

// Trade History & Analysis
router.get('/history', authenticate, TradeController.getTradeHistory);
router.get('/history/:tradeId', authenticate, TradeController.getTradeDetails);
router.get('/performance', authenticate, TradeController.getTradePerformance);
router.get('/statistics', authenticate, TradeController.getTradeStatistics);

// Open Positions
router.get('/positions/open', authenticate, TradeController.getOpenPositions);
router.get('/positions/closed', authenticate, TradeController.getClosedPositions);
router.get('/positions/:positionId', authenticate, TradeController.getPositionDetails);

// Trade Settings
router.post('/stop-loss/:tradeId', authenticate, TradeController.setStopLoss);
router.post('/take-profit/:tradeId', authenticate, TradeController.setTakeProfit);
router.post('/trailing-stop/:tradeId', authenticate, TradeController.setTrailingStop);

// Batch Operations
router.post('/batch/execute', authenticate, TradeController.executeBatchTrades);
router.post('/batch/close', authenticate, TradeController.closeBatchTrades);

// Reports
router.get('/reports/daily', authenticate, TradeController.getDailyReport);
router.get('/reports/monthly', authenticate, TradeController.getMonthlyReport);
router.get('/reports/pnl', authenticate, TradeController.getPnLReport);

export default router;