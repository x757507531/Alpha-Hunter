import React from 'react';
import { AlertEvent } from '../types';

interface AlertCardProps {
  alert: AlertEvent;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const isGreen = alert.percentageChange > 0;
  const formattedTime = new Date(alert.timestamp).toLocaleTimeString();

  return (
    <div className={`p-4 rounded-xl border-l-4 bg-crypto-card shadow-lg transition-all hover:shadow-xl mb-4 ${isGreen ? 'border-crypto-green' : 'border-crypto-red'}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-wide">{alert.symbol}</h3>
            <span className="text-xs text-gray-500 font-mono">{formattedTime}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono text-gray-200">${alert.priceNow.toFixed(alert.priceNow < 1 ? 6 : 2)}</span>
            <span className={`text-sm font-bold ${isGreen ? 'text-crypto-green' : 'text-crypto-red'}`}>
              {isGreen ? '+' : ''}{alert.percentageChange.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Volume 24h: ${(alert.volume / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${isGreen ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {isGreen ? 'Pump' : 'Dump'}
          </div>
          
          {/* Trading Status Badge */}
          {alert.tradeStatus && (
             <div className={`text-[10px] px-2 py-0.5 rounded border ${
                alert.tradeStatus === 'EXECUTED' ? 'border-green-500 text-green-500' :
                alert.tradeStatus === 'SIMULATED' ? 'border-blue-500 text-blue-500' :
                alert.tradeStatus === 'FAILED' ? 'border-red-500 text-red-500' : 'hidden'
             }`}>
               {alert.tradeStatus === 'EXECUTED' ? 'LONG OPENED' : 
                alert.tradeStatus === 'SIMULATED' ? 'SIMULATED TRADE' : 'TRADE FAILED'}
             </div>
          )}
        </div>
      </div>

      {alert.tradeMessage && alert.tradeStatus === 'FAILED' && (
        <div className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-300">
          Error: {alert.tradeMessage}
        </div>
      )}
      
      {alert.tradeMessage && alert.tradeStatus !== 'FAILED' && alert.tradeStatus !== 'NONE' && (
         <div className="mt-2 p-2 bg-green-900/10 rounded text-xs text-gray-400 font-mono">
           &gt; {alert.tradeMessage}
         </div>
      )}
    </div>
  );
};