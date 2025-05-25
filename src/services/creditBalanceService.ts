import { useEffect, useState } from 'react';

// Credit balance service configuration
const CREDIT_BALANCE_WEBHOOK = 'https://hook.eu2.make.com/onzi7yie2mgzaf4euk6jhcmjk3lr2hl3';
const CACHE_KEY = 'teida_credit_balance';
const CACHE_EXPIRY_KEY = 'teida_credit_balance_expiry';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Types
export interface CreditBalanceResponse {
  success: boolean;
  credits: number;
  message?: string;
}

// Helper to store balance in localStorage
const storeBalanceInCache = (balance: number): void => {
  try {
    localStorage.setItem(CACHE_KEY, balance.toString());
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_EXPIRY_TIME).toString());
  } catch (error) {
    console.error('Failed to store balance in cache:', error);
  }
};

// Helper to get balance from localStorage
const getBalanceFromCache = (): number | null => {
  try {
    const balanceStr = localStorage.getItem(CACHE_KEY);
    const expiryStr = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (!balanceStr || !expiryStr) return null;
    
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) return null; // Cache expired
    
    return parseInt(balanceStr, 10);
  } catch (error) {
    console.error('Failed to get balance from cache:', error);
    return null;
  }
};

// Helper function to add delay for retry
const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Helper to try extracting a number from text using multiple patterns
const extractCreditsFromText = (text: string): number | null => {
  // Log the full response for debugging
  console.log('Raw text response:', text);
  
  // Try different patterns to extract credits
  const patterns = [
    /credits[:\s]+(\d+)/i,         // "credits: 100" or "Credits 100"
    /balance[:\s]+(\d+)/i,         // "balance: 100" or "Balance 100"
    /(\d+)\s*credits/i,            // "100 credits"
    /(\d+)/                        // Just find any number as last resort
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const credits = parseInt(match[1], 10);
      if (!isNaN(credits)) {
        console.log(`Found credits using pattern ${pattern}:`, credits);
        return credits;
      }
    }
  }
  
  return null;
};

export const creditBalanceService = {
  // Fetch current credit balance with retry logic
  async fetchCreditBalance(retryCount = 0): Promise<CreditBalanceResponse> {
    try {
      console.log('Fetching credit balance...');
      
      const response = await fetch(`${CREDIT_BALANCE_WEBHOOK}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // First try to parse as JSON
      let data;
      const contentType = response.headers.get('content-type');
      let responseText = '';
      
      try {
        responseText = await response.text();
        
        // Try to parse as JSON regardless of content-type
        try {
          data = JSON.parse(responseText);
          console.log('Parsed response as JSON:', data);
          
          // Handle JSON response
          if (typeof data.credits === 'number') {
            // Store in cache
            storeBalanceInCache(data.credits);
            
            return {
              success: true,
              credits: data.credits,
              message: data.message || 'Balansas atnaujintas'
            };
          }
        } catch (jsonError) {
          console.log('Failed to parse as JSON, treating as text');
          // Not valid JSON, continue to text parsing
        }
        
        // Try to extract credits from text
        const credits = extractCreditsFromText(responseText);
        if (credits !== null) {
          storeBalanceInCache(credits);
          
          return {
            success: true,
            credits: credits,
            message: 'Balansas atnaujintas'
          };
        }
        
        // If we reach here, we couldn't parse the response
        console.error('Could not extract credits from response:', responseText);
        throw new Error('Could not parse credit balance from response');
        
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await wait(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return this.fetchCreditBalance(retryCount + 1);
      }
      
      // Return cached value if available when all retries fail
      const cachedBalance = getBalanceFromCache();
      if (cachedBalance !== null) {
        return {
          success: true,
          credits: cachedBalance,
          message: 'Naudojamas paskutinis žinomas balansas (offline)'
        };
      }
      
      return {
        success: false,
        credits: 0,
        message: error instanceof Error ? error.message : 'Nepavyko gauti kredito balanso'
      };
    }
  }
};

// Custom hook for credit balance with auto refresh
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
        setError(result.message || 'Įvyko klaida gaunant balansą');
      }
    } catch (err) {
      setError('Nepavyko gauti kredito balanso');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Try to get from cache first
    const cachedBalance = getBalanceFromCache();
    if (cachedBalance !== null) {
      setBalance(cachedBalance);
      setLoading(false);
    }
    
    // Then fetch fresh balance
    fetchBalance();
    
    // Set up auto-refresh if enabled
    let intervalId: number | undefined;
    
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        // Only refresh if user is active (page is visible)
        if (!document.hidden) {
          fetchBalance();
        }
      }, CACHE_EXPIRY_TIME);
    }
    
    // Add event listener for when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBalance();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
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