# Benraz MCP Server

This project is a Machine Control Platform (MCP) server designed to provide API endpoints for various integrations, such as search and weather services. It is built with Node.js and is intended to be easily extensible for additional services.

## Features

- Implements the Machine Control Platform (MCP) protocol using Server-Sent Events (SSE) for bi-directional communication.
- Exposes tools for web search (Brave, Google) and weather information.
- Modular and extensible architecture for adding more services.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/)

## Setup

1. **Clone the repository:**

   ```sh
   git clone https://github.com/Joseph1977/benraz-mcp-server.git
   cd benraz-mcp-server
   ```
2. **Install dependencies:**

   ```sh
   npm install
   ```
3. **Configure environment variables:**

   Create a `.env` file in the project root with the following content (replace with your actual API keys):

   ```
   BRAVE_API_KEY=YOUR_BRAVE_API_KEY_HERE
   BRAVE_BASE_URL=https://api.search.brave.com/res/v1

   WEATHER_USER_AGENT=WeatherApp/1.0
   WEATHER_API_BASE=https://api.weather.gov

   GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
   GOOGLE_CSE_ID=YOUR_GOOGLE_CSE_ID_HERE

   MCP_PORT=4000
   MCP_HOST=0.0.0.0
   ```

   > **Note:** Do not commit your `.env` file or any file containing secrets to version control.
   >

## Building the Project

If your project uses a build step (e.g., TypeScript), run:

```sh
npm run build
```

If not, you can skip this step.

## Running the MCP Server

Start the server with:

```sh
npm start
```

The server will start and listen on the port configured in your `.env` file (default is 4000).
It provides an SSE endpoint at `/sse` for MCP communication and a `/tool_call` endpoint for clients to invoke tools.

## MCP Implementation Rationale

This server implements the MCP protocol directly using Express.js and Server-Sent Events (SSE) rather than relying solely on the `@modelcontextprotocol/sdk`. The primary reasons for this approach are:

- **Persistent Dockerized Service:** The initial goal was to create a server that could run persistently within a Docker container. The `StdioServerTransport` provided by the Node.js version of the SDK is designed for standard input/output communication, which is not suitable for a long-running network service that needs to be accessible over HTTP.
- **HTTP/SSE Transport Requirement:** For a web-accessible MCP server, an HTTP-based transport, specifically using SSE for bi-directional communication, is necessary. At the time of development, a readily available and straightforward HTTP/SSE transport was not apparent in the Node.js SDK version being used (`^1.12.1`).
- **Control and Flexibility:** Implementing the protocol directly provides greater control over the transport layer, message handling, and integration with the Express.js framework. This allows for custom logic in managing client connections and SSE streams.

While the `@modelcontextprotocol/sdk` is a valuable resource, the specific requirements for a persistent, Docker-friendly, HTTP/SSE-based server led to this custom implementation.

## Usage

- **Search Endpoint:**
  Use the `/search` endpoint to perform web searches via the Brave API.
- **Weather Endpoint:**
  Use the `/weather` endpoint to retrieve weather data from the National Weather Service.

Refer to the code or API documentation for specific endpoint details and request/response formats.

## Running with Docker

1. **Build the Docker image:**
   ```sh
   docker build -t my_mcp_server .
   ```
2. **Run the container (make sure to provide your .env file):**
   ```sh
   docker run --name my_mcp_container --env-file .env -p 4000:4000 my_mcp_server
   ```
   - Replace `4000` with your server's port if different (ensure it matches `MCP_PORT` in your `.env`).
   - Ensure your `.env` file (or `.env with secrets` if you named it that) is in the project root and accessible.

> **Note:** Never commit your `.env` file to version control.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
