// Binance WebSocket Mini Ticker Data
export interface MiniTicker {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface TokenHistory {
  symbol: string;
  history: PricePoint[];
}

export interface AlertConfig {
  timeWindowSeconds: number;
  percentageThreshold: number;
  minVolumeUSDT: number;
}

export interface TradingConfig {
  enabled: boolean;
  simulationMode: boolean;
  apiKey: string;
  apiSecret: string;
  initialBalance: number; // Total Principal
  leverage: number;
  positionSizeUSDT: number; // Notional Value per trade
  takeProfitPercent: number;
  stopLossPercent: number;
  cooldownHours: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  entryPrice: number;
  amountUSDT: number; // Notional Size
  leverage: number;
  pnl: number; // Realized or Unrealized PnL
  roi: number; // %
  status: 'OPEN' | 'WON' | 'LOST';
  timestamp: number;
  closePrice?: number;
  closeTime?: number;
}

export interface AlertEvent {
  id: string;
  symbol: string;
  timestamp: number;
  priceBefore: number;
  priceNow: number;
  percentageChange: number;
  volume: number;
  isPositive: boolean;
  tradeStatus?: 'NONE' | 'EXECUTED' | 'FAILED' | 'SIMULATED';
  tradeMessage?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}