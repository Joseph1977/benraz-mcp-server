import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Handle ES modules path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file directly
try {
  // Try both current working directory and script directory
  const cwdEnvPath = join(process.cwd(), '.env');
  const scriptEnvPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  
  let envPath = cwdEnvPath;
  if (!existsSync(cwdEnvPath)) {
    console.log('.env not found in cwd, trying script directory');
    envPath = scriptEnvPath;
  }
  
  console.log('Loading .env from:', envPath);
  const envContent = readFileSync(envPath, 'utf-8');
  console.log('Loaded .env content length:', envContent.length);
  const envVars = Object.fromEntries(
    envContent
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const [key, ...valueParts] = line.split('=');
        let value = valueParts.join('=').trim();
        // Remove quotes and semicolons
        value = value.replace(/^["']|["'];?$/g, '');
        return [key.trim(), value];
      })
  );
  console.log('Parsed environment variables:', Object.keys(envVars));
  Object.assign(process.env, envVars);
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('Error loading .env:', error.message);
  } else {
    console.error('Unknown error loading .env');
  }
}

export interface Config {
  BRAVE_API_KEY: string;
  BRAVE_BASE_URL: string;
  WEATHER_USER_AGENT: string;
  WEATHER_API_BASE: string;
}

class ConfigImpl implements Config {
  readonly BRAVE_API_KEY: string;
  readonly BRAVE_BASE_URL: string;
  readonly WEATHER_USER_AGENT: string;
  readonly WEATHER_API_BASE: string;

  constructor() {
    this.BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
    this.BRAVE_BASE_URL = process.env.BRAVE_BASE_URL || 'https://api.search.brave.com/res/v1';
    this.WEATHER_USER_AGENT = process.env.WEATHER_USER_AGENT || 'WeatherApp/1.0';
    this.WEATHER_API_BASE = process.env.WEATHER_API_BASE || 'https://api.weather.gov';

    console.log('Config values:', {
      BRAVE_API_KEY: this.BRAVE_API_KEY ? '***' : 'not set',
      BRAVE_BASE_URL: this.BRAVE_BASE_URL,
      WEATHER_USER_AGENT: this.WEATHER_USER_AGENT,
      WEATHER_API_BASE: this.WEATHER_API_BASE
    });

    if (!this.BRAVE_API_KEY) {
      throw new Error('BRAVE_API_KEY is required');
    }
  }
}

const config: Config = new ConfigImpl();
export default config; 