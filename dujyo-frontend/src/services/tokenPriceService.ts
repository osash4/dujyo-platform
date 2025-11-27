/**
 * Token Price Service - Fetches real-time DYO/DYS prices from DEX
 */
import { getApiBaseUrl } from '../utils/apiConfig';

export interface TokenPrices {
  dyo: number;
  dys: number;
  dyoChange24h: number;
  dysChange24h: number;
  lastUpdate: number;
}

class TokenPriceService {
  private cache: TokenPrices | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds

  async getTokenPrices(forceRefresh: boolean = false): Promise<TokenPrices> {
    const now = Date.now();
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/dex/token-price`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token prices: ${response.status}`);
      }

      const data = await response.json();
      const prices: TokenPrices = {
        dyo: data.dyo || 1.0,
        dys: data.dys || 1.0,
        dyoChange24h: data.dyoChange24h || 0,
        dysChange24h: data.dysChange24h || 0,
        lastUpdate: Date.now(),
      };

      this.cache = prices;
      this.cacheTimestamp = now;
      
      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      
      // Return cached data if available, even if expired
      if (this.cache) {
        return this.cache;
      }

      // Fallback to default prices
      return {
        dyo: 1.0,
        dys: 1.0,
        dyoChange24h: 0,
        dysChange24h: 0,
        lastUpdate: Date.now(),
      };
    }
  }

  convertToUSD(amount: number, token: 'DYO' | 'DYS'): Promise<number> {
    return this.getTokenPrices().then((prices) => {
      if (token === 'DYO') {
        return amount * prices.dyo;
      } else {
        return amount * prices.dys;
      }
    });
  }

  convertFromUSD(usdAmount: number, token: 'DYO' | 'DYS'): Promise<number> {
    return this.getTokenPrices().then((prices) => {
      if (token === 'DYO') {
        return usdAmount / prices.dyo;
      } else {
        return usdAmount / prices.dys;
      }
    });
  }
}

export const tokenPriceService = new TokenPriceService();

