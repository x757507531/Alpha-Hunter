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

export interface AlertEvent {
  id: string;
  symbol: string;
  timestamp: number;
  priceBefore: number;
  priceNow: number;
  percentageChange: number;
  volume: number;
  isPositive: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
