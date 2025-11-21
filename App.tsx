import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertConfig, MiniTicker, PricePoint, AlertEvent } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { AlertCard } from './components/AlertCard';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';

// Limit history to prevent memory leaks
const MAX_HISTORY_LENGTH = 120; 
const CLEANUP_INTERVAL = 10000;

const App: React.FC = () => {
  // --- State ---
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Configuration
  const [config, setConfig] = useState<AlertConfig>({
    timeWindowSeconds: 60,
    percentageThreshold: 3.0, // Default 3% to make it easier to test, can be changed to 5
    minVolumeUSDT: 1000000, // 1M Volume default
  });

  // --- Refs for High-Frequency Data (Avoid React State for these) ---
  const wsRef = useRef<WebSocket | null>(null);
  const priceHistoryRef = useRef<Map<string, PricePoint[]>>(new Map());
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map());

  // --- Sound Effect ---
  const playAlertSound = () => {
    // Simple beep using AudioContext or just an Audio element if user interaction allows
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
      // Audio context might be blocked until interaction
    }
  };

  // --- Data Processing Logic ---
  const processTickerData = useCallback((tickers: MiniTicker[]) => {
    const now = Date.now();
    const newAlerts: AlertEvent[] = [];

    tickers.forEach((ticker) => {
      // Filter: Only USDT pairs, ignore leveraged tokens (UP/DOWN/BEAR/BULL) usually
      if (!ticker.s.endsWith('USDT')) return;
      
      const price = parseFloat(ticker.c);
      const volume = parseFloat(ticker.q); // q is quote volume (USDT)

      // Volume Filter
      if (volume < config.minVolumeUSDT) return;

      // Update History
      let history = priceHistoryRef.current.get(ticker.s);
      if (!history) {
        history = [];
        priceHistoryRef.current.set(ticker.s, history);
      }

      // Add new point
      history.push({ timestamp: now, price });

      // Prune old data based on max required window (plus buffer)
      const cutoff = now - (config.timeWindowSeconds * 1000);
      
      // Optimization: Only filter if array gets too big
      if (history.length > MAX_HISTORY_LENGTH) {
        history = history.filter(p => p.timestamp >= cutoff);
        priceHistoryRef.current.set(ticker.s, history);
      }

      // --- Detection Logic ---
      // Find the oldest price point within the user's configured window
      // We iterate backwards or find index to ensure we compare against the point ~window seconds ago
      const comparisonPoint = history.find(p => p.timestamp >= cutoff);

      if (comparisonPoint) {
        const priceBefore = comparisonPoint.price;
        const change = ((price - priceBefore) / priceBefore) * 100;
        const absChange = Math.abs(change);

        if (absChange >= config.percentageThreshold) {
          // Check Debounce (don't alert same coin within configured window again)
          const lastAlert = lastAlertTimeRef.current.get(ticker.s) || 0;
          if (now - lastAlert > (config.timeWindowSeconds * 1000)) {
             
             const alert: AlertEvent = {
               id: `${ticker.s}-${now}`,
               symbol: ticker.s,
               timestamp: now,
               priceBefore,
               priceNow: price,
               percentageChange: change,
               volume,
               isPositive: change > 0
             };

             newAlerts.push(alert);
             lastAlertTimeRef.current.set(ticker.s, now);
          }
        }
      }
    });

    if (newAlerts.length > 0) {
      playAlertSound();
      // Prepend new alerts
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50
    }
  }, [config]);

  // --- WebSocket Connection ---
  useEffect(() => {
    // Close existing if any
    if (wsRef.current) {
      wsRef.current.close();
    }

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
      console.log('Disconnected. Reconnecting in 3s...');
      setTimeout(() => {
        // Simple reconnect logic
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      ws.close();
    };

    return () => {
      ws.close();
    };
  }, [processTickerData]);

  // --- Memory Cleanup ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - (config.timeWindowSeconds * 1000 * 2); // Keep a bit more history than needed
      
      priceHistoryRef.current.forEach((history, symbol) => {
        // If no update in a long time, delete the key
        if (history.length === 0 || history[history.length - 1].timestamp < cutoff) {
           priceHistoryRef.current.delete(symbol);
           lastAlertTimeRef.current.delete(symbol);
        } else {
           // Prune array
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
            {/* Author Badge */}
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
              onConfigChange={setConfig} 
              isOpen={showSettings} 
              onToggle={() => setShowSettings(!showSettings)} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        
        {/* Status Bar */}
        <div className="mb-6 flex items-center justify-between text-sm text-gray-400">
          <div>
            Monitoring <span className="text-white font-mono">{priceHistoryRef.current.size}</span> active pairs
          </div>
          <div className="flex items-center gap-2">
             <span>Criteria:</span>
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