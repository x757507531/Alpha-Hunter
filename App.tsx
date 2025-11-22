import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertConfig, MiniTicker, PricePoint, AlertEvent, TradingConfig, TradeRecord } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { AlertCard } from './components/AlertCard';
import { DashboardStats } from './components/DashboardStats';
import { executeTrade } from './services/tradeService';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';

// Limit history to prevent memory leaks
const MAX_HISTORY_LENGTH = 120; 
const CLEANUP_INTERVAL = 10000;

const App: React.FC = () => {
  // --- State ---
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]); // Track all trades
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Scanner Configuration
  const [config, setConfig] = useState<AlertConfig>({
    timeWindowSeconds: 60,
    percentageThreshold: 3.0, 
    minVolumeUSDT: 1000000, 
  });

  // Trading Configuration
  const [tradingConfig, setTradingConfig] = useState<TradingConfig>({
    enabled: false,
    simulationMode: true,
    apiKey: '',
    apiSecret: '',
    initialBalance: 100, // Default 100U Principal
    leverage: 10,
    positionSizeUSDT: 100, // Default 100U Position Size
    takeProfitPercent: 6,
    stopLossPercent: 3,
    cooldownHours: 12,
  });

  // --- Refs for High-Frequency Data ---
  const wsRef = useRef<WebSocket | null>(null);
  const priceHistoryRef = useRef<Map<string, PricePoint[]>>(new Map());
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map()); 
  const lastTradeTimeRef = useRef<Map<string, number>>(new Map());
  
  // Shadow Trading Refs (to track TP/SL in real-time without re-rendering App on every tick)
  const activeTradesRef = useRef<Map<string, TradeRecord>>(new Map());

  // --- Sound Effect ---
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } catch (e) {
      // Audio context might be blocked
    }
  };

  // --- Trade Execution Logic ---
  const triggerAutoTrade = async (symbol: string, price: number): Promise<{ status: AlertEvent['tradeStatus'], message?: string }> => {
    if (!tradingConfig.enabled) return { status: 'NONE' };

    const now = Date.now();
    const lastTrade = lastTradeTimeRef.current.get(symbol) || 0;
    const cooldownMs = tradingConfig.cooldownHours * 60 * 60 * 1000;

    if (now - lastTrade < cooldownMs) {
      return { status: 'NONE' }; 
    }

    // Execute Trade (API Call)
    const result = await executeTrade(symbol, price, tradingConfig);

    if (result.success) {
        lastTradeTimeRef.current.set(symbol, now);
        
        // Create Trade Record for Shadow Tracking
        const newTrade: TradeRecord = {
            id: `TRADE-${symbol}-${now}`,
            symbol,
            entryPrice: price,
            amountUSDT: tradingConfig.positionSizeUSDT,
            leverage: tradingConfig.leverage,
            pnl: 0,
            roi: 0,
            status: 'OPEN',
            timestamp: now
        };
        
        // Add to Ref for fast processing
        activeTradesRef.current.set(symbol, newTrade);
        
        // Add to State for UI
        setTrades(prev => [newTrade, ...prev]);

        return { 
            status: tradingConfig.simulationMode ? 'SIMULATED' : 'EXECUTED',
            message: result.message
        };
    } else {
        return { 
            status: 'FAILED',
            message: result.message
        };
    }
  };

  // --- Data Processing Logic ---
  const processTickerData = useCallback(async (tickers: MiniTicker[]) => {
    const now = Date.now();
    const potentialAlerts: AlertEvent[] = [];
    let tradesUpdated = false; // Flag to check if we need to update 'trades' state

    for (const ticker of tickers) {
      if (!ticker.s.endsWith('USDT')) continue;
      
      const price = parseFloat(ticker.c);
      const volume = parseFloat(ticker.q); 

      // --- 1. Shadow Trading: Check TP/SL for Active Trades ---
      if (activeTradesRef.current.has(ticker.s)) {
         const trade = activeTradesRef.current.get(ticker.s)!;
         
         // Calculate current PnL
         // Direction: Long (price - entry) / entry * leverage * size
         const rawPnlPercent = (price - trade.entryPrice) / trade.entryPrice;
         const leveragedPnlPercent = rawPnlPercent * trade.leverage;
         const uPnL = (trade.amountUSDT / trade.leverage) * leveragedPnlPercent; // Margin * %Gain
         
         trade.pnl = uPnL;
         trade.roi = leveragedPnlPercent * 100;

         // Check TP (Take Profit)
         if (trade.roi >= tradingConfig.takeProfitPercent) {
             trade.status = 'WON';
             trade.closePrice = price;
             trade.closeTime = now;
             activeTradesRef.current.delete(ticker.s);
             tradesUpdated = true;
         } 
         // Check SL (Stop Loss)
         else if (trade.roi <= -tradingConfig.stopLossPercent) {
             trade.status = 'LOST';
             trade.closePrice = price;
             trade.closeTime = now;
             activeTradesRef.current.delete(ticker.s);
             tradesUpdated = true;
         }
      }

      // --- 2. Market Scanning Logic ---
      if (volume < config.minVolumeUSDT) continue;

      let history = priceHistoryRef.current.get(ticker.s);
      if (!history) {
        history = [];
        priceHistoryRef.current.set(ticker.s, history);
      }

      history.push({ timestamp: now, price });

      const cutoff = now - (config.timeWindowSeconds * 1000);
      if (history.length > MAX_HISTORY_LENGTH) {
        history = history.filter(p => p.timestamp >= cutoff);
        priceHistoryRef.current.set(ticker.s, history);
      }

      const comparisonPoint = history.find(p => p.timestamp >= cutoff);

      if (comparisonPoint) {
        const priceBefore = comparisonPoint.price;
        const change = ((price - priceBefore) / priceBefore) * 100;
        const absChange = Math.abs(change);

        if (absChange >= config.percentageThreshold) {
          const lastAlert = lastAlertTimeRef.current.get(ticker.s) || 0;
          
          if (now - lastAlert > (config.timeWindowSeconds * 1000)) {
             const isPositive = change > 0;
             
             let tradeResult: { status: AlertEvent['tradeStatus']; message?: string } = { status: 'NONE', message: '' };
             
             if (isPositive) {
                tradeResult = await triggerAutoTrade(ticker.s, price);
             }

             const alert: AlertEvent = {
               id: `${ticker.s}-${now}`,
               symbol: ticker.s,
               timestamp: now,
               priceBefore,
               priceNow: price,
               percentageChange: change,
               volume,
               isPositive,
               tradeStatus: tradeResult.status,
               tradeMessage: tradeResult.message
             };

             potentialAlerts.push(alert);
             lastAlertTimeRef.current.set(ticker.s, now);
          }
        }
      }
    }

    // Batch updates
    if (potentialAlerts.length > 0) {
      playAlertSound();
      setAlerts(prev => [...potentialAlerts, ...prev].slice(0, 50)); 
    }

    // If trades closed (TP/SL hit), update state immediately
    if (tradesUpdated) {
        setTrades(prev => prev.map(t => {
           // If the trade is in our closed list (removed from Ref but ID exists in state), update it
           // We need to find the updated object in the 'closed' pile or modify logic slightly
           // Simpler: We updated the object reference inside activeTradesRef before deleting it.
           // But we need to sync that specific object back to state.
           
           // Actually, since we mutated the object in the Map, let's find it. 
           // Warning: We deleted it from Map. 
           // Let's reconstruct the state from the "Closed" events we just processed? 
           // Easier: Iterate all previous trades, if ID matches one we just modified, update.
           // Since we don't have a list of *just modified* trades here easily without extra vars:
           // We will let the Interval Sync handle the PnL updates, BUT we must handle Status changes immediately.
           return t;
        }));
        
        // Force sync of status for closed trades
        // In a real app, we'd use a reducer. Here we just trigger a refresh from the refs if possible, 
        // but since we deleted from Ref, we need to rely on the mutation we did.
        // The mutation: 'trade.status = WON'. That object reference is still in the 'trades' array if we didn't deep clone.
        // So 'setTrades([...trades])' might work to trigger re-render.
        setTrades(prev => [...prev]);
    }

  }, [config, tradingConfig]);

  // --- Interval Sync for Real-Time PnL ---
  // Since WebSocket runs fast, we don't want to setTrades state on every tick for PnL numbers.
  // We mutate the objects in activeTradesRef, and then periodically sync the UI.
  useEffect(() => {
      const interval = setInterval(() => {
          if (activeTradesRef.current.size > 0) {
              setTrades(prev => [...prev]); // Force re-render to show updated PnL
          }
      }, 1000);
      return () => clearInterval(interval);
  }, []);


  // --- WebSocket Connection ---
  useEffect(() => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(BINANCE_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to Binance WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data: MiniTicker[] = JSON.parse(event.data);
        if (Array.isArray(data)) {
           processTickerData(data);
        }
      } catch (err) {
        console.error('Parse error', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => { /* Reconnect logic handled by effect deps if needed */ }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [processTickerData]);

  // --- Memory Cleanup ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - (config.timeWindowSeconds * 1000 * 2);
      
      priceHistoryRef.current.forEach((history, symbol) => {
        if (history.length === 0 || history[history.length - 1].timestamp < cutoff) {
           priceHistoryRef.current.delete(symbol);
        } else {
           const newHistory = history.filter(p => p.timestamp >= cutoff);
           priceHistoryRef.current.set(symbol, newHistory);
        }
      });
    }, CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, [config]);

  return (
    <div className="min-h-screen bg-crypto-dark flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-crypto-card/80 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              ALPHA<span className="text-crypto-accent">HUNTER</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <a 
              href="https://twitter.com/mangojay09" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full transition-colors border border-gray-700/50 group"
            >
              <img 
                src="https://unavatar.io/twitter/mangojay09" 
                alt="mangojay09" 
                className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-crypto-accent transition-colors"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
                }}
              />
              <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors hidden sm:inline">@mangojay09</span>
            </a>

            <SettingsPanel 
              config={config} 
              tradingConfig={tradingConfig}
              onConfigChange={setConfig} 
              onTradingConfigChange={setTradingConfig}
              isOpen={showSettings} 
              onToggle={() => setShowSettings(!showSettings)} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        
        {/* Dashboard Stats */}
        {tradingConfig.enabled && (
            <DashboardStats trades={trades} config={tradingConfig} />
        )}

        {/* Status Bar */}
        <div className="mb-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex flex-col sm:flex-row sm:gap-4">
             <span>Active Pairs: <span className="text-white font-mono">{priceHistoryRef.current.size}</span></span>
             {tradingConfig.enabled && (
                 <span className="flex items-center gap-1">
                    Mode: 
                    <span className={`font-bold ${tradingConfig.simulationMode ? 'text-blue-400' : 'text-green-400'}`}>
                        {tradingConfig.simulationMode ? 'SIMULATION' : 'LIVE API'}
                    </span>
                 </span>
             )}
          </div>
          <div className="flex items-center gap-2">
             <span className="hidden sm:inline">Scanner:</span>
             <span className="px-2 py-1 bg-gray-800 rounded text-white border border-gray-700">
               {config.percentageThreshold}% in {config.timeWindowSeconds}s
             </span>
          </div>
        </div>

        {/* Alerts Feed */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <div className="inline-block p-4 rounded-full bg-gray-800 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xl font-medium text-gray-300">Scanning the market for alpha...</p>
              <p className="text-sm text-gray-500 mt-2">Waiting for volatility to hit threshold.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default App;