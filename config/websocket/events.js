export const SOCKET_EVENTS = {
  // Connection Events
  CONNECTION_SUCCESS: 'connection_success',
  CONNECTION_ERROR: 'connection_error',
  DISCONNECT: 'disconnect',

  // Subscription Events
  SUBSCRIBE_CRYPTO: 'subscribe_crypto',
  SUBSCRIBE_MARKET: 'subscribe_market',
  SUBSCRIBE_PORTFOLIO: 'subscribe_portfolio',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  SUBSCRIPTION_ERROR: 'subscription_error',
  UNSUBSCRIBE: 'unsubscribe',
  UNSUBSCRIBE_SUCCESS: 'unsubscribe_success',

  // Stream Events
  START_STREAM: 'start_stream',
  STREAM_STARTED: 'stream_started',
  STOP_STREAM: 'stop_stream',
  STREAM_STOPPED: 'stream_stopped',
  STREAM_ERROR: 'stream_error',

  // Room Events
  JOIN_ROOM: 'join_room',
  ROOM_JOINED: 'room_joined',
  LEAVE_ROOM: 'leave_room',
  ROOM_LEFT: 'room_left',
  ROOM_ERROR: 'room_error',

  // Update Events
  PORTFOLIO_UPDATE: 'PORTFOLIO_UPDATE',
  PORTFOLIO_VALUE_UPDATE: 'PORTFOLIO_VALUE_UPDATE',
  TRADE_UPDATE: 'TRADE_UPDATE',
  PRICE_UPDATE: 'PRICE_UPDATE',
  MARKET_UPDATE: 'MARKET_UPDATE',
  ORDERBOOK_UPDATE: 'ORDERBOOK_UPDATE',
  BALANCE_UPDATE: 'BALANCE_UPDATE',
  GAS_UPDATE: 'GAS_UPDATE',
  ASSET_UPDATE: 'ASSET_UPDATE',

  // Alert Events
  PRICE_ALERT: 'PRICE_ALERT',
  RISK_ALERT: 'RISK_ALERT',

  // Cache Events
  CACHE_UPDATE: 'CACHE_UPDATE',
  CACHE_STATUS: 'CACHE_STATUS',
  CACHE_REFRESH: 'CACHE_REFRESH'
};

export const SOCKET_ERRORS = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',
  STREAM_ERROR: 'STREAM_ERROR',
  ROOM_ERROR: 'ROOM_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};