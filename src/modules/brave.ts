import type { SearchResult } from 'modules/types';
import config from 'modules/config';

export interface BraveService {
  search(query: string, count?: number): Promise<SearchResult[]>;
}

class BraveServiceImpl implements BraveService {
  private readonly API_KEY = config.BRAVE_API_KEY;
  private readonly BASE_URL = config.BRAVE_BASE_URL;

  async search(query: string, count: number = 10): Promise<SearchResult[]> {
    const url = `${this.BASE_URL}/web/search?q=${encodeURIComponent(query)}&count=${count}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.web?.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description
      })) || [];
    } catch (error) {
      console.error('Error making Brave search request:', error);
      return [];
    }
  }
}

export const braveService: BraveService = new BraveServiceImpl(); 