export interface MarketData {
  symbol: string;
  price: string;
  priceChange24h: string;
  volume24h: string;
  marketCap: string;
  timestamp: string;
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
  totalValue: string;
  pnl: string;
  pnlPercentage: string;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: string;
  price: string;
  totalValue: string;
  executedAt: string;
}

export interface AIInsight {
  id: string;
  type: 'sentiment' | 'pattern' | 'news';
  title: string;
  description: string;
  confidence: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  impact?: string;
  sentiment?: string;
  publishedAt: string;
}

export interface OrderBookEntry {
  price: string;
  quantity: string;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface DashboardData {
  assets: any[];
  positions: Position[];
  trades: Trade[];
  insights: AIInsight[];
  news: NewsItem[];
  user: any;
}
