import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { weatherService } from './modules/weather';
import { braveService } from './modules/brave';
import { googleSearchService } from './modules/googleSearch';
import { z } from "zod";
import type { 
  AlertsResponse, 
  PointsResponse, 
  ForecastResponse,
  AlertFeature,
  ForecastPeriod
} from 'modules/types';

// Create server instance
console.info("Creating MCP Server...");
const server = new McpServer({
  name: "MyFirst_MCPserver",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register get-alerts tool
console.info("Registering get-alerts tool...");
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${weatherService.NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await weatherService.makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [{ type: "text", text: "Failed to retrieve alerts data" }],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [{ type: "text", text: `No active alerts for ${stateCode}` }],
      };
    }

    const formattedAlerts = features.map((feature: AlertFeature) => weatherService.formatAlert(feature));
    return {
      content: [
        {
          type: "text",
          text: `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`,
        },
      ],
    };
  }
);

// Register get-forecast tool
console.info("Registering get-forecast tool...");
server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    const pointsUrl = `${weatherService.NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await weatherService.makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData?.properties?.forecast) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast data for this location",
          },
        ],
      };
    }

    const forecastData = await weatherService.makeNWSRequest<ForecastResponse>(pointsData.properties.forecast);
    if (!forecastData?.properties?.periods?.length) {
      return {
        content: [{ type: "text", text: "No forecast data available" }],
      };
    }

    const formattedForecast = forecastData.properties.periods.map((period: ForecastPeriod) => 
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n")
    );

    return {
      content: [
        {
          type: "text",
          text: `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`,
        },
      ],
    };
  }
);

// Register brave-web-search tool
console.info("Registering brave-web-search tool...");
server.tool(
  "brave-web-search",
  "Search the web using Brave Search",
  {
    query: z.string().describe("The search query"),
    count: z.number().min(1).max(20).optional().describe("Number of results to return (max 20)")
  },
  async ({ query, count = 10 }) => {
    const results = await braveService.search(query, count);
    
    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "No search results found" }]
      };
    }

    const formattedResults = results.map(result => 
      [
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        result.description ? `Description: ${result.description}` : '',
        '---'
      ].filter(Boolean).join('\n')
    );

    return {
      content: [
        {
          type: "text",
          text: `Search results for "${query}":\n\n${formattedResults.join('\n')}`
        }
      ]
    };
  }
);

// Register google-search tool
console.info("Registering google-search tool...");
server.tool(
  "google-search",
  "Search the web using Google Custom Search",
  {
    query: z.string().describe("The search query"),
    count: z.number().min(1).max(10).optional().describe("Number of results to return (max 10)")
  },
  async ({ query, count = 5 }) => {
    const results = await googleSearchService.search(query, count);
    if (!results.length) {
      return {
        content: [
          {
            type: "text",
            text: "No results found from Google Search."
          }
        ]
      };
    }
    const formattedResults = results.map(
      (r, i) => `${i + 1}. ${r.title}\n${r.link}\n${r.snippet}`
    );
    return {
      content: [
        {
          type: "text",
          text: `Google Search results for "${query}":\n\n${formattedResults.join('\n\n')}`
        }
      ]
    };
  }
);

async function main() {
  console.info("Starting MCP Server...");
  const transport = new StdioServerTransport();
  console.info("Transport created");
  
  try {
    console.info("Attempting to connect transport...");
    await server.connect(transport);
    console.info("Transport connected successfully");
    console.info("\nMCP Server running on stdio");
  } catch (error) {
    console.error("Error connecting transport:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});