import React from 'react';
import { TradeRecord, TradingConfig } from '../types';

interface DashboardStatsProps {
  trades: TradeRecord[];
  config: TradingConfig;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ trades, config }) => {
  const activeTrades = trades.filter(t => t.status === 'OPEN');
  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  
  // Calculate Totals
  const realizedPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const unrealizedPnL = activeTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalPnL = realizedPnL + unrealizedPnL;
  
  const currentBalance = config.initialBalance + totalPnL;
  const totalRoi = ((currentBalance - config.initialBalance) / config.initialBalance) * 100;
  
  const winCount = closedTrades.filter(t => t.status === 'WON').length;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Balance Card */}
      <div className="bg-crypto-card border border-gray-700 rounded-xl p-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-2 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
         </div>
         <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Balance</h3>
         <div className="text-2xl font-mono text-white font-bold mt-1">
            ${currentBalance.toFixed(2)}
         </div>
         <div className="text-xs text-gray-500 mt-1">
            Principal: ${config.initialBalance}
         </div>
      </div>

      {/* PnL Card */}
      <div className={`bg-crypto-card border rounded-xl p-4 relative overflow-hidden ${totalPnL >= 0 ? 'border-green-900/50' : 'border-red-900/50'}`}>
         <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total PnL</h3>
         <div className={`text-2xl font-mono font-bold mt-1 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
         </div>
         <div className={`text-xs mt-1 font-bold ${totalRoi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ROI: {totalRoi.toFixed(2)}%
         </div>
      </div>

      {/* Performance Card */}
      <div className="bg-crypto-card border border-gray-700 rounded-xl p-4">
         <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider">Win Rate</h3>
         <div className="flex items-baseline gap-2 mt-1">
             <div className="text-2xl font-mono text-crypto-accent font-bold">
                {winRate.toFixed(0)}%
             </div>
             <span className="text-xs text-gray-500">
                ({winCount}/{closedTrades.length})
             </span>
         </div>
         <div className="w-full bg-gray-700 h-1.5 mt-2 rounded-full overflow-hidden">
            <div className="bg-crypto-accent h-full transition-all duration-500" style={{ width: `${winRate}%` }}></div>
         </div>
      </div>

      {/* Active Trades Card */}
      <div className="bg-crypto-card border border-gray-700 rounded-xl p-4">
         <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider">Active Positions</h3>
         <div className="text-2xl font-mono text-white font-bold mt-1">
            {activeTrades.length}
         </div>
         <div className="text-xs text-gray-500 mt-1">
            Unrealized: <span className={unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)}
            </span>
         </div>
      </div>
    </div>
  );
};