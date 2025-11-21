import React from 'react';
import { AlertConfig } from '../types';

interface SettingsPanelProps {
  config: AlertConfig;
  onConfigChange: (newConfig: AlertConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange, isOpen, onToggle }) => {
  const handleChange = (key: keyof AlertConfig, value: number) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
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
        <span>Scanner Settings</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-crypto-card border border-gray-700 rounded-xl shadow-2xl p-5 text-left animate-fade-in-down">
          <h3 className="text-lg font-semibold text-white mb-4">Detection Thresholds</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Time Window (Seconds)</label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={config.timeWindowSeconds}
                onChange={(e) => handleChange('timeWindowSeconds', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-crypto-accent"
              />
              <div className="text-right text-sm text-crypto-accent font-mono">{config.timeWindowSeconds}s</div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Min % Change</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={config.percentageThreshold}
                  onChange={(e) => handleChange('percentageThreshold', parseFloat(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-crypto-accent"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Min 24h Volume (USDT)</label>
              <select
                value={config.minVolumeUSDT}
                onChange={(e) => handleChange('minVolumeUSDT', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-crypto-accent"
              >
                <option value={100000}>$100k+</option>
                <option value={1000000}>$1M+</option>
                <option value={5000000}>$5M+</option>
                <option value={10000000}>$10M+</option>
                <option value={50000000}>$50M+</option>
              </select>
            </div>
            
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              Monitoring all USDT pairs. Lower thresholds will result in more alerts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
