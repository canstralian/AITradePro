import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { marketDataService } from "./services/market-data";
import { aiAnalysisService } from "./services/ai-analysis";
import { vectorStoreService } from "./services/vector-store";
import { asyncWorkerService } from "./services/async-workers";
import { apiRateLimit, tradingRateLimit, securityHeaders, validateSymbol } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time data
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Add client to all services
    marketDataService.addClient(ws);
    aiAnalysisService.addClient(ws);
    asyncWorkerService.addClient(ws);
    
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'ai_query') {
          const response = await aiAnalysisService.processNaturalLanguageQuery(message.query);
          
          // Also perform enhanced RAG analysis
          const ragAnalysis = await vectorStoreService.performRAGAnalysis(message.query, 'BTC');
          
          ws.send(JSON.stringify({
            type: 'ai_response',
            data: {
              query: message.query,
              response,
              ragAnalysis,
              timestamp: new Date().toISOString(),
            }
          }));
        }
        
        if (message.type === 'enqueue_analysis') {
          const taskId = await asyncWorkerService.enqueueTask({
            type: message.analysisType || 'market_analysis',
            payload: message.payload,
            priority: message.priority || 'medium'
          });
          
          ws.send(JSON.stringify({
            type: 'task_queued',
            data: { taskId, status: 'queued' }
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

  // Apply security middleware to all routes
  app.use(securityHeaders);
  app.use('/api', apiRateLimit);

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
  app.get("/api/assets/:id", validateSymbol, async (req, res) => {
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

  // Enhanced RAG Analysis endpoint
  app.get("/api/rag-analysis/:symbol", validateSymbol, async (req, res) => {
    try {
      const { symbol } = req.params;
      const { query } = req.query;
      
      const analysis = await vectorStoreService.performRAGAnalysis(
        query as string || `Analyze ${symbol}`,
        symbol
      );
      
      res.json({
        symbol,
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "RAG analysis failed" });
    }
  });

  // Worker queue status endpoint
  app.get("/api/workers/status", async (req, res) => {
    try {
      const status = asyncWorkerService.getQueueStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch worker status" });
    }
  });

  // Enqueue analysis task endpoint
  app.post("/api/workers/enqueue", async (req, res) => {
    try {
      const { type, payload, priority = 'medium' } = req.body;
      
      const taskId = await asyncWorkerService.enqueueTask({
        type,
        payload,
        priority
      });
      
      res.json({ taskId, status: 'queued' });
    } catch (error) {
      res.status(500).json({ message: "Failed to enqueue task" });
    }
  });

  // Get task result endpoint
  app.get("/api/workers/result/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const result = asyncWorkerService.getTaskResult(taskId);
      
      if (!result) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task result" });
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
