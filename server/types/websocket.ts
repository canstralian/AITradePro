export interface WebSocketMessage {
  type: string;
  data?: unknown;
  query?: string;
  analysisType?: string;
  payload?: unknown;
  priority?: 'low' | 'medium' | 'high';
}

export interface AIQueryMessage extends WebSocketMessage {
  type: 'ai_query';
  query: string;
}

export interface EnqueueAnalysisMessage extends WebSocketMessage {
  type: 'enqueue_analysis';
  analysisType: 'market_analysis' | 'news_correlation' | 'pattern_matching' | 'sentiment_analysis';
  payload: {
    symbol?: string;
    timeframe?: string;
    newsItems?: Array<{ id: string; title: string; }>;
    priceData?: unknown;
    sources?: string[];
  };
  priority: 'low' | 'medium' | 'high';
}

export interface WebSocketResponse {
  type: 'ai_response' | 'task_queued' | 'error' | 'connection_established' | 'worker_status' | 'worker_result';
  data: {
    error?: string;
    clientId?: string;
    timestamp?: string;
    query?: string;
    response?: unknown;
    ragAnalysis?: unknown;
    taskId?: string;
    status?: string;
    [key: string]: unknown;
  };
}