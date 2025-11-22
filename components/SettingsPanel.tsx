import React, { useState } from 'react';
import { AlertConfig, TradingConfig } from '../types';

interface SettingsPanelProps {
  config: AlertConfig;
  tradingConfig: TradingConfig;
  onConfigChange: (newConfig: AlertConfig) => void;
  onTradingConfigChange: (newConfig: TradingConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  config, 
  tradingConfig,
  onConfigChange, 
  onTradingConfigChange,
  isOpen, 
  onToggle 
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'trading'>('scanner');

  const handleScanChange = (key: keyof AlertConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleTradeChange = (key: keyof TradingConfig, value: any) => {
    onTradingConfigChange({ ...tradingConfig, [key]: value });
  };

  return (
    <div className="relative z-20">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-crypto-card hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        <span>Config</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-crypto-card border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
          <div className="flex border-b border-gray-700">
            <button 
              className={`flex-1 py-3 text-sm font-bold ${activeTab === 'scanner' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('scanner')}
            >
              Scanner
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold ${activeTab === 'trading' ? 'bg-gray-700 text-crypto-accent' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('trading')}
            >
              Auto-Trade
            </button>
          </div>

          <div className="p-5 max-h-[80vh] overflow-y-auto">
            {activeTab === 'scanner' ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detection Rules</h3>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time Window (Seconds)</label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={config.timeWindowSeconds}
                    onChange={(e) => handleScanChange('timeWindowSeconds', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-crypto-accent"
                  />
                  <div className="text-right text-sm text-crypto-accent font-mono">{config.timeWindowSeconds}s</div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min % Change</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={config.percentageThreshold}
                      onChange={(e) => handleScanChange('percentageThreshold', parseFloat(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-crypto-accent"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min 24h Volume (USDT)</label>
                  <select
                    value={config.minVolumeUSDT}
                    onChange={(e) => handleScanChange('minVolumeUSDT', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-crypto-accent"
                  >
                    <option value={100000}>$100k+</option>
                    <option value={1000000}>$1M+</option>
                    <option value={5000000}>$5M+</option>
                    <option value={10000000}>$10M+</option>
                    <option value={50000000}>$50M+</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-medium">Enable Auto-Trading</label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          checked={tradingConfig.enabled}
                          onChange={(e) => handleTradeChange('enabled', e.target.checked)}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-green-400"
                          style={{ right: tradingConfig.enabled ? '0' : 'auto', left: tradingConfig.enabled ? 'auto' : '0' }}
                        />
                        <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${tradingConfig.enabled ? 'bg-green-400' : 'bg-gray-600'}`}></label>
                    </div>
                </div>

                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200 mb-4">
                    ⚠ WARNING: Use at your own risk. Keys are stored in memory only. <br/>
                    <strong>Enable "Simulation Mode" to test without funds.</strong>
                </div>

                <div className="flex items-center gap-2 mb-4">
                   <input 
                      type="checkbox" 
                      checked={tradingConfig.simulationMode}
                      onChange={(e) => handleTradeChange('simulationMode', e.target.checked)}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-crypto-accent focus:ring-0"
                   />
                   <span className="text-sm text-gray-300">Simulation Mode (Mock Trade)</span>
                </div>

                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Portfolio Settings</h3>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Total Principal (USDT)</label>
                    <input
                        type="number"
                        value={tradingConfig.initialBalance}
                        onChange={(e) => handleTradeChange('initialBalance', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Used for ROI calculation</p>
                </div>

                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">API Keys (Binance Futures)</h3>
                <input
                  type="text"
                  placeholder="API Key"
                  value={tradingConfig.apiKey}
                  onChange={(e) => handleTradeChange('apiKey', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-white mb-2 focus:border-crypto-accent outline-none"
                />
                <input
                  type="password"
                  placeholder="API Secret"
                  value={tradingConfig.apiSecret}
                  onChange={(e) => handleTradeChange('apiSecret', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-white focus:border-crypto-accent outline-none"
                />

                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Strategy Settings</h3>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Position (USDT)</label>
                        <input
                            type="number"
                            value={tradingConfig.positionSizeUSDT}
                            onChange={(e) => handleTradeChange('positionSizeUSDT', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Leverage (x)</label>
                        <input
                            type="number"
                            value={tradingConfig.leverage}
                            onChange={(e) => handleTradeChange('leverage', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-green-400 mb-1">Take Profit (%)</label>
                        <input
                            type="number"
                            value={tradingConfig.takeProfitPercent}
                            onChange={(e) => handleTradeChange('takeProfitPercent', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-red-400 mb-1">Stop Loss (%)</label>
                        <input
                            type="number"
                            value={tradingConfig.stopLossPercent}
                            onChange={(e) => handleTradeChange('stopLossPercent', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">Cooldown per Token (Hours)</label>
                    <input
                        type="number"
                        value={tradingConfig.cooldownHours}
                        onChange={(e) => handleTradeChange('cooldownHours', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};