# Benraz MCP Server

This project is a Machine Control Platform (MCP) server designed to provide API endpoints for various integrations, such as search and weather services. It is built with Node.js and is intended to be easily extensible for additional services.

## Features

- Integrates with Brave Search API for web search functionality.
- Integrates with the National Weather Service API for weather data.
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
   BRAVE_API_KEY=your_brave_api_key
   BRAVE_BASE_URL=https://api.search.brave.com/res/v1

   WEATHER_USER_AGENT=WeatherApp/1.0
   WEATHER_API_BASE=https://api.weather.gov
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

The server will start and listen on the configured port (default is usually 3000 or as set in your environment).

## Usage

- **Search Endpoint:**
  Use the `/search` endpoint to perform web searches via the Brave API.
- **Weather Endpoint:**
  Use the `/weather` endpoint to retrieve weather data from the National Weather Service.

Refer to the code or API documentation for specific endpoint details and request/response formats.

## Running with Docker

1. **Build the Docker image:**

   ```sh
   docker build -t myfirst_mcpserver .
   ```
2. **Run the container (make sure to provide your .env file):**

   ```sh
   docker run --name my_mcp_container --env-file ".env with secrets" -p 3000:3000 myfirst_mcpserver
   ```

   - Replace `3000` with your server's port if different.
   - Ensure your `.env with secrets` file is in the project root.

> **Note:** Never commit your `.env with secrets` file to version control.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
