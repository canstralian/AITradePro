import { storage } from "../storage";
import { WebSocket } from "ws";

export class MarketDataService {
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private connectedClients: Set<WebSocket> = new Set();

  start() {
    this.priceUpdateInterval = setInterval(async () => {
      await this.updatePrices();
    }, 3000); // Update every 3 seconds
  }

  stop() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }

  addClient(ws: WebSocket) {
    this.connectedClients.add(ws);
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });
  }

  private async updatePrices() {
    const assets = await storage.getAssets();
    
    for (const asset of assets) {
      const currentPrice = parseFloat(asset.currentPrice);
      const volatility = this.getVolatilityForAsset(asset.symbol);
      
      // Generate realistic price movement
      const priceChange = (Math.random() - 0.5) * 2 * volatility * currentPrice / 100;
      const newPrice = Math.max(currentPrice + priceChange, currentPrice * 0.95); // Prevent prices going too low
      
      const priceChange24h = ((newPrice - currentPrice) / currentPrice * 100);
      
      await storage.updateAssetPrice(
        asset.id, 
        newPrice.toFixed(8),
        priceChange24h.toFixed(4)
      );

      // Add to market data history
      await storage.addMarketData({
        assetId: asset.id,
        price: newPrice.toFixed(8),
        volume: (Math.random() * 1000000).toFixed(2),
        timestamp: new Date(),
      });

      // Broadcast to connected clients
      this.broadcastPriceUpdate(asset.symbol, newPrice, priceChange24h);
    }
  }

  private getVolatilityForAsset(symbol: string): number {
    const volatilities: Record<string, number> = {
      'BTC': 0.8,
      'ETH': 1.2,
      'SOL': 2.5,
      'ADA': 1.8,
      'AVAX': 2.0,
    };
    return volatilities[symbol] || 1.5;
  }

  private broadcastPriceUpdate(symbol: string, price: number, priceChange24h: number) {
    const message = JSON.stringify({
      type: 'price_update',
      data: {
        symbol,
        price: price.toFixed(8),
        priceChange24h: priceChange24h.toFixed(4),
        timestamp: new Date().toISOString(),
      }
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async generateHistoricalData(assetId: string, hours: number = 24) {
    const asset = await storage.getAsset(assetId);
    if (!asset) return;

    const basePrice = parseFloat(asset.currentPrice);
    const volatility = this.getVolatilityForAsset(asset.symbol);
    
    // Generate historical data points
    for (let i = hours; i > 0; i--) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      const priceVariation = (Math.random() - 0.5) * volatility * basePrice / 100;
      const price = basePrice + priceVariation;
      
      await storage.addMarketData({
        assetId,
        price: price.toFixed(8),
        volume: (Math.random() * 1000000).toFixed(2),
        timestamp,
      });
    }
  }
}

export const marketDataService = new MarketDataService();
