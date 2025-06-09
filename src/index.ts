import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { weatherService } from './modules/weather';
import { braveService } from './modules/brave';
import { googleSearchService } from './modules/googleSearch';
import type {
  AlertsResponse,
  PointsResponse,
  ForecastResponse,
  AlertFeature,
  ForecastPeriod,
  SearchResult,
  GoogleSearchResult
} from './modules/types';
import config from './modules/config'; // To get MCP_PORT and MCP_HOST

// Define a type for our tool functions
type ToolHandler = (params: any) => Promise<any>; // Simplified, will refine later

interface ToolDefinition {
  description: string;
  schema: z.ZodObject<any, any, any>; // Simplified Zod schema type
  handler: ToolHandler;
}

// Store tool definitions
const tools = new Map<string, ToolDefinition>();

// Store active SSE clients: Map<clientId, Response object>
const activeSseClients = new Map<string, Response>();

// Helper to register tools (mimicking McpServer.tool)
function registerTool(
  name: string,
  description: string,
  schema: z.ZodObject<any, any, any>,
  handler: ToolHandler
) {
  console.info(`Registering tool: ${name}`);
  tools.set(name, { description, schema, handler });
}

// Helper function to convert Zod type to JSON Schema property
function zodToJsonSchemaProperty(zodType: z.ZodTypeAny): any {
  const description = zodType.description;
  let schema: any = {};

  // Check for optional or default types first
  if (zodType._def?.typeName === 'ZodOptional' || zodType._def?.typeName === 'ZodDefault') {
    // Recursively call for the inner type and merge description
    const innerSchema = zodToJsonSchemaProperty(zodType._def.innerType || zodType._def.type);
    if (description && !innerSchema.description) { // Prioritize inner description if available
        innerSchema.description = description;
    }
    return innerSchema;
  }

  if (zodType._def?.typeName === 'ZodString') {
    schema.type = 'string';
  } else if (zodType._def?.typeName === 'ZodNumber') {
    schema.type = 'number';
  } else if (zodType._def?.typeName === 'ZodBoolean') {
    schema.type = 'boolean';
  } else {
    // Basic fallback for other types
    console.warn(`Unsupported Zod type for direct JSON Schema conversion: ${zodType._def?.typeName}. Defaulting to 'object'.`);
    schema.type = 'object';
    schema.description = `Complex type: ${zodType._def?.typeName}`;
  }

  if (description) {
    schema.description = description;
  }
  return schema;
}

// --- Register your tools ---
// Register get-alerts tool
registerTool(
  "get-alerts",
  "Get weather alerts for a state",
  z.object({ // Corrected to use z.object()
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  }),
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${weatherService.NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await weatherService.makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return { type: "text", text: "Failed to retrieve alerts data" };
    }
    const features = alertsData.features || [];
    if (features.length === 0) {
      return { type: "text", text: `No active alerts for ${stateCode}` };
    }
    const formattedAlerts = features.map((feature: AlertFeature) => weatherService.formatAlert(feature));
    return {
      type: "text",
      text: `Active alerts for ${stateCode}:\\n\\n${formattedAlerts.join("\\n")}`,
    };
  }
);

// Register get-forecast tool
registerTool(
  "get-forecast",
  "Get weather forecast for a location",
  z.object({ // Corrected to use z.object()
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
  }),
  async ({ latitude, longitude }) => {
    const pointsUrl = `${weatherService.NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await weatherService.makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData?.properties?.forecast) {
      return {
        type: "text",
        text: "Failed to get forecast data for this location",
      };
    }
    const forecastData = await weatherService.makeNWSRequest<ForecastResponse>(pointsData.properties.forecast);
    if (!forecastData?.properties?.periods?.length) {
      return { type: "text", text: "No forecast data available" };
    }
    const formattedForecast = forecastData.properties.periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\\n")
    );
    return {
      type: "text",
      text: `Forecast for ${latitude}, ${longitude}:\\n\\n${formattedForecast.join("\\n")}`,
    };
  }
);

// Register brave-web-search tool
registerTool(
  "brave-web-search",
  "Search the web using Brave Search",
  z.object({ // Corrected to use z.object()
    query: z.string().describe("The search query"),
    count: z.number().min(1).max(20).optional().describe("Number of results to return (max 20)")
  }),
  async ({ query, count = 10 }) => {
    const results = await braveService.search(query, count);
    if (results.length === 0) {
      return { type: "text", text: "No search results found" };
    }
    const formattedResults = results.map((result: SearchResult) => // Added type for result
      [
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        result.description ? `Description: ${result.description}` : '',
        '---'
      ].filter(Boolean).join('\\n')
    );
    return {
      type: "text",
      text: `Search results for "${query}":\\n\\n${formattedResults.join('\\n')}`
    };
  }
);

// Register google-search tool
registerTool(
  "google-search",
  "Search the web using Google Custom Search",
  z.object({ // Corrected to use z.object()
    query: z.string().describe("The search query"),
    count: z.number().min(1).max(10).optional().describe("Number of results to return (max 10)")
  }),
  async ({ query, count = 5 }) => {
    const results = await googleSearchService.search(query, count);
    if (!results.length) {
      return {
        type: "text",
        text: "No results found from Google Search."
      };
    }
    const formattedResults = results.map(
      (r: GoogleSearchResult, i: number) => `${i + 1}. ${r.title}\\n${r.link}\\n${r.snippet}` // Added types
    );
    return {
      type: "text",
      text: `Google Search results for "${query}":\\n\\n${formattedResults.join('\\n\\n')}`
    };
  }
);
// --- End of tool registration ---


const app = express();
app.use(express.json());

// MCP Handshake Response
const mcpHandshakeResponse = {
  type: "mcp_handshake_response", // Added type field
  mcp_version: "1.0",
  server_name: "MyCustom_MCP_Express_Server",
  server_version: "1.0.0",
  capabilities: {
    tools: Array.from(tools.entries()).map(([name, { description, schema }]) => {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      if (schema && schema.shape) {
        for (const key in schema.shape) {
          const fieldSchema = schema.shape[key];
          properties[key] = zodToJsonSchemaProperty(fieldSchema);
          // Check if the field is optional
          if (!(fieldSchema._def?.typeName === 'ZodOptional' || fieldSchema._def?.typeName === 'ZodDefault')) {
            required.push(key);
          }
        }
      }
      return {
        name,
        description,
        parameters: { type: "object", properties, ...(required.length > 0 && { required }) },
      };
    }),
    resources: {}, // Define if you have resources
  },
};

// SSE Handler
app.get('/sse', (req: Request, res: Response) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[SSE ${req.ip}] Connection attempt received for /sse. Assigning clientId: ${clientId}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  console.log(`[SSE ${clientId}] Headers flushed. Client connected.`);

  activeSseClients.set(clientId, res);
  console.log(`[SSE ${clientId}] Client stored. Active clients: ${activeSseClients.size}`);

  // Send handshake message
  const handshakeId = `sse-handshake-${Date.now()}`;
  const handshakeDataString = JSON.stringify(mcpHandshakeResponse);
  const handshakeMessage = [
    `id: ${handshakeId}`,
    'event: mcp',
    `data: ${handshakeDataString}`,
    ''
  ].join('\\n') + '\\n';
  
  try {
    res.write(handshakeMessage);
    console.log(`[SSE ${clientId}] Handshake message sent.`);

    // Send clientId assigned message
    const clientIdMessageId = `sse-clientid-${Date.now()}`;
    const clientIdMessagePayload = { type: "client_id_assigned", client_id: clientId };
    const clientIdMessage = [
      `id: ${clientIdMessageId}`,
      'event: mcp',
      `data: ${JSON.stringify(clientIdMessagePayload)}`,
      ''
    ].join('\\n') + '\\n';
    res.write(clientIdMessage);
    console.log(`[SSE ${clientId}] Client ID assigned message sent.`);

  } catch (e) {
    console.error(`[SSE ${clientId}] Error writing initial messages to stream:`, e);
    res.end(); // End the response if write fails
    activeSseClients.delete(clientId); // Clean up
    console.log(`[SSE ${clientId}] Client removed due to write error. Active clients: ${activeSseClients.size}`);
    return;
  }

  req.on('close', () => {
    activeSseClients.delete(clientId);
    console.log(`[SSE ${clientId}] Client disconnected. Removed from active list. Active clients: ${activeSseClients.size}`);
  });

  req.on('error', (err) => {
    console.error(`[SSE ${clientId}] Request error:`, err);
    activeSseClients.delete(clientId);
    console.log(`[SSE ${clientId}] Client removed due to request error. Active clients: ${activeSseClients.size}`);
  });

  res.on('error', (err) => {
    console.error(`[SSE ${clientId}] Response stream error:`, err);
    activeSseClients.delete(clientId);
    console.log(`[SSE ${clientId}] Client removed due to response error. Active clients: ${activeSseClients.size}`);
  });
});

// Function to send SSE messages to a specific client
function sendSseMessage(clientId: string, eventName: string, data: any, messageIdPrefix: string = 'msg') {
  const clientRes = activeSseClients.get(clientId);
  if (clientRes) {
    const sseMessageId = `${messageIdPrefix}-${Date.now()}`;
    const message = [
      `id: ${sseMessageId}`,
      `event: ${eventName}`,
      `data: ${JSON.stringify(data)}`,
      ''
    ].join('\\n') + '\\n';
    try {
      clientRes.write(message);
      console.log(`[SSE ${clientId}] Sent message (event: ${eventName}): ${JSON.stringify(data)}`);
    } catch (e) {
      console.error(`[SSE ${clientId}] Failed to send message (event: ${eventName}):`, e);
      // Optionally remove client if write fails consistently
    }
  } else {
    console.warn(`[SSE] Attempted to send message to non-existent or disconnected client: ${clientId}`);
  }
}


// Define the tool_call handler separately
const toolCallHandler: RequestHandler = async (req, res, _next) => {
  // Expect client_id in the body now
  const { id: messageId, tool_name, parameters, client_id: clientId } = req.body;

  if (!clientId) {
    res.status(400).json({
      id: messageId || 'unknown',
      type: "error",
      error_type: "missing_client_id",
      message: "client_id is required in the request body for /tool_call.",
    });
    return;
  }

  if (!activeSseClients.has(clientId)) {
     res.status(400).json({
      id: messageId || 'unknown',
      type: "error",
      error_type: "invalid_client_id",
      message: `No active SSE session found for client_id: ${clientId}. Please connect to /sse first.`,
    });
    return;
  }

  if (!tool_name || !tools.has(tool_name)) {
    const errorPayload = {
      id: messageId,
      type: "error",
      error_type: "unknown_tool",
      message: `Tool '${tool_name}' not found.`,
    };
    sendSseMessage(clientId, 'mcp', errorPayload, 'err');
    res.status(400).json(errorPayload); // Also send HTTP error for the POST
    return;
  }

  const tool = tools.get(tool_name)!;

  try {
    const validatedParams = tool.schema.parse(parameters);
    const result = await tool.handler(validatedParams);

    const toolResponseMessage = {
      id: messageId,
      type: "tool_response",
      tool_name,
      tool_response: result,
    };
    sendSseMessage(clientId, 'mcp', toolResponseMessage, 'toolrsp');
    
    // Respond to the HTTP POST request minimally
    res.status(202).json({ id: messageId, status: "processing", message: "Tool call accepted, response will be sent via SSE." });
    return;

  } catch (error) {
    let errorType = "tool_error";
    let errorMessage = "Tool execution failed.";
    let httpStatus = 500;

    if (error instanceof z.ZodError) {
      errorType = "invalid_parameters";
      errorMessage = `Parameter validation failed: ${error.errors.map(e => e.message).join(', ')}`;
      httpStatus = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error(`[ToolCall ${clientId}] Error executing tool ${tool_name}:`, error);
    
    const errorPayload = {
      id: messageId,
      type: "error",
      error_type: errorType,
      message: errorMessage,
    };
    sendSseMessage(clientId, 'mcp', errorPayload, 'err');
    res.status(httpStatus).json(errorPayload); // Also send HTTP error for the POST
    return;
  }
};

// Endpoint for tool calls (client-to-server)
app.post('/tool_call', toolCallHandler);


async function main() {
  const PORT = parseInt(process.env.MCP_PORT || '4000', 10);
  const HOST = process.env.MCP_HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`MCP-like server with SSE listening on http://${HOST}:${PORT}`);
    console.log(`SSE endpoint available at http://${HOST}:${PORT}/sse`);
    console.log(`Tool call endpoint (POST) available at http://${HOST}:${PORT}/tool_call`);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});