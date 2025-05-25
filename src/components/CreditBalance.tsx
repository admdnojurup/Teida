import React, { useEffect } from 'react';
import { useCreditBalance } from '../services/creditBalanceService';
import { Coins as Coin, AlertCircle, RefreshCw } from 'lucide-react';

interface CreditBalanceProps {
  onTranslationComplete?: boolean;
}

export const CreditBalance: React.FC<CreditBalanceProps> = ({ 
  onTranslationComplete = false 
}) => {
  const { balance, loading, error, refresh } = useCreditBalance(true);

  // Refresh balance when a translation completes
  useEffect(() => {
    if (onTranslationComplete) {
      refresh();
    }
  }, [onTranslationComplete, refresh]);

  if (error) {
    return (
      <div className="flex items-center text-red-500 text-sm">
        <AlertCircle size={16} className="mr-1" />
        <span className="sr-only">Klaida:</span>
        <span>Nepavyko gauti balanso</span>
        <button 
          onClick={refresh}
          className="ml-2 p-1 text-red-700 hover:text-red-900 focus:outline-none"
          aria-label="Bandyti dar kartą"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="credit-balance flex items-center">
      <Coin size={18} className="text-guru-500 mr-1" />
      
      {loading && balance === null ? (
        <div className="text-sm flex items-center">
          <div className="h-3 w-12 bg-surface-200 animate-pulse rounded"></div>
          <span className="ml-1 text-surface-500">kreditai</span>
        </div>
      ) : (
        <div className="text-sm flex items-center">
          <span className="font-medium">{balance}</span>
          <span className="ml-1 text-surface-500">kreditai</span>
        </div>
      )}
      
      {loading && balance !== null && (
        <div className="ml-1 h-3 w-3 rounded-full border-2 border-guru-500 border-t-transparent animate-spin"></div>
      )}
    </div>
  );
};