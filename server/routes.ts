import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { marketDataService } from "./services/market-data";
import { aiAnalysisService } from "./services/ai-analysis";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time data
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Add client to both services
    marketDataService.addClient(ws);
    aiAnalysisService.addClient(ws);
    
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'ai_query') {
          const response = await aiAnalysisService.processNaturalLanguageQuery(message.query);
          ws.send(JSON.stringify({
            type: 'ai_response',
            data: {
              query: message.query,
              response,
              timestamp: new Date().toISOString(),
            }
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { timestamp: new Date().toISOString() }
    }));
  });

  // REST API Routes

  // Get all assets
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // Get specific asset
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  // Get market data for asset
  app.get("/api/assets/:id/market-data", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const marketData = await storage.getMarketData(req.params.id, limit);
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Get user positions
  app.get("/api/users/:userId/positions", async (req, res) => {
    try {
      const positions = await storage.getUserPositions(req.params.userId);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  // Get user trades
  app.get("/api/users/:userId/trades", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const trades = await storage.getUserTrades(req.params.userId, limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  // Get AI insights
  app.get("/api/insights", async (req, res) => {
    try {
      const assetId = req.query.assetId as string;
      const insights = await storage.getActiveInsights(assetId);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  // Get news
  app.get("/api/news", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const news = await storage.getRecentNews(limit);
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Get dashboard data (combined endpoint)
  app.get("/api/dashboard", async (req, res) => {
    try {
      const userId = "user-1"; // Mock user ID
      
      const [assets, positions, trades, insights, news] = await Promise.all([
        storage.getAssets(),
        storage.getUserPositions(userId),
        storage.getUserTrades(userId, 5),
        storage.getActiveInsights(),
        storage.getRecentNews(5),
      ]);

      res.json({
        assets,
        positions,
        trades,
        insights,
        news,
        user: await storage.getUser(userId),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Start services
  marketDataService.start();
  aiAnalysisService.start();

  // Generate initial historical data for all assets
  const assets = await storage.getAssets();
  for (const asset of assets) {
    await marketDataService.generateHistoricalData(asset.id, 24);
  }

  return httpServer;
}
