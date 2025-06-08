import type { GoogleSearchResult } from 'modules/types';
import config from 'modules/config';

export interface GoogleSearchService {
  search(query: string, count?: number): Promise<GoogleSearchResult[]>;
}

class GoogleSearchServiceImpl implements GoogleSearchService {
  private readonly API_KEY = config.GOOGLE_API_KEY;
  private readonly CX = config.GOOGLE_CSE_ID;

  async search(query: string, count: number = 5): Promise<GoogleSearchResult[]> {
    const url = `https://www.googleapis.com/customsearch/v1?key=${this.API_KEY}&cx=${this.CX}&q=${encodeURIComponent(query)}&num=${count}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return (data.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      console.error('Error making Google search request:', error);
      return [];
    }
  }
}

export const googleSearchService: GoogleSearchService = new GoogleSearchServiceImpl();