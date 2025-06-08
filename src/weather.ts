import type { AlertFeature } from 'types';
import config from 'config';

export interface WeatherService {
  NWS_API_BASE: string;
  makeNWSRequest<T>(url: string): Promise<T | null>;
  formatAlert(feature: AlertFeature): string;
}

class WeatherServiceImpl implements WeatherService {
  private readonly USER_AGENT = config.WEATHER_USER_AGENT;
  public readonly NWS_API_BASE = config.WEATHER_API_BASE;

  async makeNWSRequest<T>(url: string): Promise<T | null> {
    const headers = {
      "User-Agent": this.USER_AGENT,
      Accept: "application/geo+json",
    };

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error("Error making NWS request:", error);
      return null;
    }
  }

  formatAlert(feature: AlertFeature): string {
    const props = feature.properties;
    return [
      `Event: ${props.event || "Unknown"}`,
      `Area: ${props.areaDesc || "Unknown"}`,
      `Severity: ${props.severity || "Unknown"}`,
      `Status: ${props.status || "Unknown"}`,
      `Headline: ${props.headline || "No headline"}`,
      "---",
    ].join("\n");
  }
}

export const weatherService: WeatherService = new WeatherServiceImpl(); 