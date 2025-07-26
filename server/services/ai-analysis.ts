import { storage } from "../storage";
import { WebSocket } from "ws";

export class AIAnalysisService {
  private analysisInterval: NodeJS.Timeout | null = null;
  private connectedClients: Set<WebSocket> = new Set();

  start() {
    this.analysisInterval = setInterval(async () => {
      await this.generateInsights();
    }, 30000); // Generate insights every 30 seconds
  }

  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  addClient(ws: WebSocket) {
    this.connectedClients.add(ws);
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });
  }

  private async generateInsights() {
    const assets = await storage.getAssets();
    
    for (const asset of assets) {
      // Generate sentiment analysis
      if (Math.random() > 0.7) {
        await this.generateSentimentInsight(asset.id);
      }
      
      // Generate pattern matching insight
      if (Math.random() > 0.8) {
        await this.generatePatternInsight(asset.id);
      }
      
      // Generate news impact insight
      if (Math.random() > 0.9) {
        await this.generateNewsInsight(asset.id);
      }
    }
  }

  private async generateSentimentInsight(assetId: string) {
    const sentiments = [
      {
        title: "Market Sentiment",
        description: "Strong accumulation detected. Whale activity increased significantly.",
        confidence: (80 + Math.random() * 15).toFixed(2),
        metadata: { status: "Bullish", whaleActivity: "+34%" }
      },
      {
        title: "Social Sentiment",
        description: "Positive social media sentiment spike detected across platforms.",
        confidence: (75 + Math.random() * 20).toFixed(2),
        metadata: { status: "Positive", socialScore: "+23%" }
      },
      {
        title: "Market Fear Index",
        description: "Fear index showing extreme greed territory, potential reversal signal.",
        confidence: (70 + Math.random() * 25).toFixed(2),
        metadata: { status: "Warning", fearIndex: "76" }
      }
    ];

    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    await storage.createInsight({
      assetId,
      type: "sentiment",
      title: sentiment.title,
      description: sentiment.description,
      confidence: sentiment.confidence,
      metadata: sentiment.metadata,
      isActive: true,
    });

    this.broadcastInsight(assetId, "sentiment", sentiment);
  }

  private async generatePatternInsight(assetId: string) {
    const patterns = [
      {
        title: "Pattern Match",
        description: "Similar to Oct 2020 breakout pattern. Expected target: $48,500",
        confidence: (85 + Math.random() * 10).toFixed(2),
        metadata: { pattern: "Bull Flag", target: "$48,500", similarity: "92%" }
      },
      {
        title: "Technical Analysis",
        description: "Double bottom formation confirmed. Strong support at current levels.",
        confidence: (78 + Math.random() * 15).toFixed(2),
        metadata: { pattern: "Double Bottom", support: "Current", strength: "Strong" }
      },
      {
        title: "Fibonacci Retracement",
        description: "Price bouncing perfectly off 0.618 Fibonacci level.",
        confidence: (82 + Math.random() * 12).toFixed(2),
        metadata: { level: "0.618", action: "Bounce", signal: "Bullish" }
      }
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    await storage.createInsight({
      assetId,
      type: "pattern",
      title: pattern.title,
      description: pattern.description,
      confidence: pattern.confidence,
      metadata: pattern.metadata,
      isActive: true,
    });

    this.broadcastInsight(assetId, "pattern", pattern);
  }

  private async generateNewsInsight(assetId: string) {
    const newsInsights = [
      {
        title: "News Impact",
        description: "Positive ETF news correlation. Social sentiment up significantly.",
        confidence: (75 + Math.random() * 20).toFixed(2),
        metadata: { impact: "Medium", correlation: "ETF", sentiment: "+23%" }
      },
      {
        title: "Regulatory News",
        description: "Positive regulatory developments in major markets detected.",
        confidence: (80 + Math.random() * 15).toFixed(2),
        metadata: { impact: "High", type: "Regulatory", region: "Global" }
      },
      {
        title: "Institutional Activity",
        description: "Increased institutional buying pressure from recent announcements.",
        confidence: (85 + Math.random() * 10).toFixed(2),
        metadata: { impact: "High", type: "Institutional", trend: "Buying" }
      }
    ];

    const newsInsight = newsInsights[Math.floor(Math.random() * newsInsights.length)];
    
    await storage.createInsight({
      assetId,
      type: "news",
      title: newsInsight.title,
      description: newsInsight.description,
      confidence: newsInsight.confidence,
      metadata: newsInsight.metadata,
      isActive: true,
    });

    this.broadcastInsight(assetId, "news", newsInsight);
  }

  private broadcastInsight(assetId: string, type: string, insight: any) {
    const message = JSON.stringify({
      type: 'ai_insight',
      data: {
        assetId,
        insightType: type,
        ...insight,
        timestamp: new Date().toISOString(),
      }
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async processNaturalLanguageQuery(query: string): Promise<string> {
    // Simple keyword-based response generation
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('bitcoin') || lowerQuery.includes('btc')) {
      const btc = await storage.getAssetBySymbol('BTC');
      if (btc) {
        return `Bitcoin is currently trading at $${btc.currentPrice} with a 24h change of ${btc.priceChange24h}%. Our AI analysis shows strong accumulation patterns and bullish sentiment.`;
      }
    }
    
    if (lowerQuery.includes('market') && lowerQuery.includes('trend')) {
      return "Current market trends show strong bullish momentum across major cryptocurrencies. Bitcoin correlation with traditional markets has decreased, indicating crypto market maturity.";
    }
    
    if (lowerQuery.includes('pattern') || lowerQuery.includes('technical')) {
      return "Technical analysis reveals a strong bull flag pattern formation. Historical pattern matching shows 89% similarity to previous breakout scenarios.";
    }
    
    if (lowerQuery.includes('portfolio') || lowerQuery.includes('allocation')) {
      return "Your current portfolio shows strong diversification with 45% Bitcoin, 25% Ethereum, and 30% in altcoins. Consider rebalancing based on current market conditions.";
    }
    
    // Default response
    return "Based on current market analysis, we're seeing positive sentiment across major assets. Would you like me to analyze a specific cryptocurrency or market trend?";
  }
}

export const aiAnalysisService = new AIAnalysisService();
