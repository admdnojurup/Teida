import { useState, useEffect } from 'react';

const CACHE_KEY = 'teida_credit_balance';
const CACHE_EXPIRY_KEY = 'teida_credit_balance_expiry';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

interface CreditBalanceResponse {
  success: boolean;
  credits: number;
  message?: string;
}

const storeBalanceInCache = (balance: number): void => {
  try {
    localStorage.setItem(CACHE_KEY, balance.toString());
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_EXPIRY_TIME).toString());
  } catch (error) {
    console.error('Failed to store balance in cache:', error);
  }
};

const getBalanceFromCache = (): number | null => {
  try {
    const balanceStr = localStorage.getItem(CACHE_KEY);
    const expiryStr = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (!balanceStr || !expiryStr) return null;
    
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) return null;
    
    return parseInt(balanceStr, 10);
  } catch (error) {
    console.error('Failed to get balance from cache:', error);
    return null;
  }
};

export const creditBalanceService = {
  async fetchCreditBalance(): Promise<CreditBalanceResponse> {
    try {
      const response = await fetch('/api/credits/balance');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (typeof data.credits === 'number') {
        storeBalanceInCache(data.credits);
        return {
          success: true,
          credits: data.credits,
          message: 'Balance updated successfully'
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      
      const cachedBalance = getBalanceFromCache();
      if (cachedBalance !== null) {
        return {
          success: true,
          credits: cachedBalance,
          message: 'Using cached balance'
        };
      }
      
      return {
        success: false,
        credits: 0,
        message: error instanceof Error ? error.message : 'Failed to fetch credit balance'
      };
    }
  }
};

export const useCreditBalance = (autoRefresh = true) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await creditBalanceService.fetchCreditBalance();
      
      if (result.success) {
        setBalance(result.credits);
      } else {
        setError(result.message || 'Failed to fetch balance');
      }
    } catch (err) {
      setError('Failed to fetch credit balance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const cachedBalance = getBalanceFromCache();
    if (cachedBalance !== null) {
      setBalance(cachedBalance);
      setLoading(false);
    }
    
    fetchBalance();
    
    let intervalId: number | undefined;
    
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        if (!document.hidden) {
          fetchBalance();
        }
      }, CACHE_EXPIRY_TIME);
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBalance();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh]);
  
  return {
    balance,
    loading,
    error,
    refresh: fetchBalance
  };
};