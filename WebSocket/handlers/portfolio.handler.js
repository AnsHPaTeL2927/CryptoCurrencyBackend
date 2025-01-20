// websocket/handlers/portfolio.handler.js
import { portfolioService } from '../../services/portfolio.service.js';
import { marketService } from '../../services/market.service.js';
import { redisClient } from '../../config/redis.js';
import { validateToken } from '../../utils/jwt.utils.js';

class PortfolioHandler {
  constructor() {
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of coinId -> Set of userIds
    this.priceAlerts = new Map(); // Map of userId -> Array of price alerts
    this.updateInterval = null;
  }

  // Initialize handler
  initialize() {
    this.startPriceUpdateInterval();
    this.initializeAlertSystem();
  }

  // Handle new WebSocket connection
  async handleConnection(ws, request) {
    try {
      // Extract and validate token from request
      const token = this.extractToken(request);
      const decoded = await validateToken(token);
      const userId = decoded.userId;

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Set up message handler
      ws.on('message', async (message) => {
        await this.handleMessage(userId, ws, message);
      });

      // Set up close handler
      ws.on('close', () => {
        this.handleDisconnection(userId, ws);
      });

      // Send initial portfolio data
      await this.sendInitialData(userId, ws);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  // Handle WebSocket messages
  async handleMessage(userId, ws, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe_portfolio':
          await this.handlePortfolioSubscription(userId, ws);
          break;

        case 'subscribe_price_alerts':
          await this.handlePriceAlertSubscription(userId, data.parameters);
          break;

        case 'update_alert':
          await this.updatePriceAlert(userId, data.alertId, data.parameters);
          break;

        case 'get_historical_performance':
          await this.sendHistoricalPerformance(userId, ws, data.timeframe);
          break;

        case 'add_transaction':
          await this.handleNewTransaction(userId, data.transaction);
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Message handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  // Real-time portfolio updates
  async sendPortfolioUpdate(userId, ws) {
    try {
      const portfolioData = await portfolioService.getPortfolioSummary(userId);
      const message = {
        type: 'portfolio_update',
        data: portfolioData,
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Portfolio update error:', error);
    }
  }

  // Price alert handling
  async checkPriceAlerts(prices) {
    for (const [userId, alerts] of this.priceAlerts) {
      const triggeredAlerts = alerts.filter(alert => {
        const currentPrice = prices[alert.coinId];
        return this.isAlertTriggered(alert, currentPrice);
      });

      if (triggeredAlerts.length > 0) {
        await this.notifyTriggeredAlerts(userId, triggeredAlerts);
      }
    }
  }

  // Historical performance data
  async sendHistoricalPerformance(userId, ws, timeframe) {
    try {
      const performance = await portfolioService.getPortfolioPerformance(userId, timeframe);
      ws.send(JSON.stringify({
        type: 'historical_performance',
        data: performance,
        timeframe
      }));
    } catch (error) {
      console.error('Historical performance error:', error);
    }
  }

  // Real-time transaction handling
  async handleNewTransaction(userId, transaction) {
    try {
      await portfolioService.addTransaction(userId, transaction);
      
      // Update all connected clients for this user
      const userConnections = this.clients.get(userId);
      if (userConnections) {
        const portfolioData = await portfolioService.getPortfolioSummary(userId);
        const message = {
          type: 'transaction_update',
          data: {
            transaction,
            portfolio: portfolioData
          }
        };

        userConnections.forEach(ws => {
          if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
          }
        });
      }
    } catch (error) {
      console.error('Transaction handling error:', error);
    }
  }

  // Helper Methods
  private async startPriceUpdateInterval() {
    this.updateInterval = setInterval(async () => {
      try {
        const activeCoins = this.getActiveCoins();
        if (activeCoins.size > 0) {
          const prices = await marketService.getCurrentPrices([...activeCoins]);
          await this.broadcastPriceUpdates(prices);
          await this.checkPriceAlerts(prices);
        }
      } catch (error) {
        console.error('Price update interval error:', error);
      }
    }, 5000); // Update every 5 seconds
  }

  private extractToken(request) {
    const token = request.url.split('token=')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    return token;
  }

  private getActiveCoins() {
    const coins = new Set();
    for (const [userId, userAlerts] of this.priceAlerts) {
      userAlerts.forEach(alert => coins.add(alert.coinId));
    }
    return coins;
  }

  private async notifyTriggeredAlerts(userId, alerts) {
    const connections = this.clients.get(userId);
    if (connections) {
      const message = {
        type: 'price_alerts_triggered',
        alerts: alerts
      };

      connections.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  private handleDisconnection(userId, ws) {
    const userConnections = this.clients.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.clients.delete(userId);
        // Cleanup user's subscriptions
        this.cleanupUserSubscriptions(userId);
      }
    }
  }

  private cleanupUserSubscriptions(userId) {
    this.priceAlerts.delete(userId);
    // Cleanup other subscriptions as needed
  }

  private async initializeAlertSystem() {
    try {
      // Load existing alerts from database
      const alerts = await portfolioService.getAllAlerts();
      alerts.forEach(alert => {
        const userId = alert.userId;
        if (!this.priceAlerts.has(userId)) {
          this.priceAlerts.set(userId, []);
        }
        this.priceAlerts.get(userId).push(alert);
      });
    } catch (error) {
      console.error('Alert system initialization error:', error);
    }
  }

  private isAlertTriggered(alert, currentPrice) {
    switch (alert.condition) {
      case 'above':
        return currentPrice >= alert.targetPrice;
      case 'below':
        return currentPrice <= alert.targetPrice;
      case 'percentage_increase':
        return (currentPrice - alert.basePrice) / alert.basePrice * 100 >= alert.percentage;
      case 'percentage_decrease':
        return (alert.basePrice - currentPrice) / alert.basePrice * 100 >= alert.percentage;
      default:
        return false;
    }
  }
}

export const portfolioHandler = new PortfolioHandler();