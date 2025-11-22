import React, { useState } from 'react';
import { AlertEvent, AnalysisStatus } from '../types';
import { analyzeTokenSurge } from '../services/geminiService';

interface AlertCardProps {
  alert: AlertEvent;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setStatus(AnalysisStatus.LOADING);
    const result = await analyzeTokenSurge(alert.symbol, alert.percentageChange, alert.priceNow);
    setAnalysis(result);
    setStatus(AnalysisStatus.SUCCESS);
  };

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

      {/* Gemini Analysis Section */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        {status === AnalysisStatus.IDLE && (
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 text-sm text-crypto-accent hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Ask Gemini AI Analysis
          </button>
        )}

        {status === AnalysisStatus.LOADING && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
             <svg className="animate-spin h-4 w-4 text-crypto-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing market data...
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && analysis && (
          <div className="bg-gray-800/50 rounded-lg p-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
               <svg className="h-4 w-4 text-crypto-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
               </svg>
               <span className="text-xs font-bold text-crypto-accent uppercase">Gemini Analysis</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {analysis}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};