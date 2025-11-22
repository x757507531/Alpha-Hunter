import { TradingConfig } from '../types';

// Helper to access crypto-js from global scope (added via CDN)
declare const CryptoJS: any;

const FAPI_BASE = 'https://fapi.binance.com';

const signQuery = (query: string, secret: string): string => {
  const signature = CryptoJS.HmacSHA256(query, secret).toString(CryptoJS.enc.Hex);
  return `${query}&signature=${signature}`;
};

export const executeTrade = async (
  symbol: string,
  currentPrice: number,
  config: TradingConfig
): Promise<{ success: boolean; message: string }> => {
  if (config.simulationMode) {
    console.log(`[SIMULATION] Executing Long on ${symbol} at $${currentPrice}`);
    console.log(`[SIMULATION] Size: ${config.positionSizeUSDT} USDT, Lev: ${config.leverage}x`);
    console.log(`[SIMULATION] TP: +${config.takeProfitPercent}%, SL: -${config.stopLossPercent}%`);
    return { success: true, message: 'Simulation: Trade Executed' };
  }

  if (!config.apiKey || !config.apiSecret) {
    return { success: false, message: 'API Keys missing' };
  }

  try {
    const timestamp = Date.now();
    const headers = {
      'X-MBX-APIKEY': config.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // 1. Set Leverage
    const levQuery = `symbol=${symbol}&leverage=${config.leverage}&timestamp=${timestamp}`;
    await fetch(`${FAPI_BASE}/fapi/v1/leverage?${signQuery(levQuery, config.apiSecret)}`, {
      method: 'POST',
      headers,
    });

    // 2. Calculate Quantity
    // Precision logic is complex (Binance Exchange Info), using simpler floor logic for MVP
    // Position Size is Notional Value. Quantity = Size / Price.
    const rawQty = config.positionSizeUSDT / currentPrice;
    // Heuristic: For prices > 1, use 1-3 decimals. For < 1, use 0.
    // This is a simplification. Real apps need to fetch exchangeInfo.
    let qtyPrecision = 0;
    if (currentPrice < 1) qtyPrecision = 0; 
    else if (currentPrice < 10) qtyPrecision = 1;
    else qtyPrecision = 3;
    
    const quantity = parseFloat(rawQty.toFixed(qtyPrecision));

    if (quantity <= 0) return { success: false, message: 'Calculated quantity too small' };

    // 3. Market Buy Order
    const orderQuery = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${Date.now()}`;
    const orderRes = await fetch(`${FAPI_BASE}/fapi/v1/order?${signQuery(orderQuery, config.apiSecret)}`, {
      method: 'POST',
      headers,
    });

    if (!orderRes.ok) {
      const err = await orderRes.json();
      throw new Error(err.msg || 'Order Failed');
    }

    // 4. Place TP/SL (Using simple separate orders for MVP reliability)
    // Take Profit Limit
    const tpPrice = (currentPrice * (1 + config.takeProfitPercent / 100)).toFixed(2); // 2 decimals standard for USDT
    const tpQuery = `symbol=${symbol}&side=SELL&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${tpPrice}&timestamp=${Date.now()}`;
    
    // Stop Loss Market (Trigger)
    const slPrice = (currentPrice * (1 - config.stopLossPercent / 100)).toFixed(2);
    const slQuery = `symbol=${symbol}&side=SELL&type=STOP_MARKET&quantity=${quantity}&stopPrice=${slPrice}&timestamp=${Date.now()}`;

    // Execute TP/SL asynchronously so main trade isn't blocked
    Promise.all([
      fetch(`${FAPI_BASE}/fapi/v1/order?${signQuery(tpQuery, config.apiSecret)}`, { method: 'POST', headers }),
      fetch(`${FAPI_BASE}/fapi/v1/order?${signQuery(slQuery, config.apiSecret)}`, { method: 'POST', headers })
    ]).catch(e => console.error("TP/SL placement warning", e));

    return { success: true, message: `Long Open @ ${currentPrice}. TP: ${tpPrice}, SL: ${slPrice}` };

  } catch (error: any) {
    console.error("Trade Error:", error);
    let msg = error.message;
    if (msg.includes('Failed to fetch')) msg = 'CORS Error (Use Proxy or Simulation)';
    return { success: false, message: msg };
  }
};