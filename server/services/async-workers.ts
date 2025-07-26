import { EventEmitter } from 'events';
import { storage } from '../storage';
import { WebSocket } from 'ws';

export interface WorkerTask {
  id: string;
  type: 'market_analysis' | 'news_correlation' | 'pattern_matching' | 'sentiment_analysis';
  payload: any;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  retries: number;
}

export interface WorkerResult {
  taskId: string;
  result: any;
  duration: number;
  success: boolean;
  error?: string;
}

export class AsyncWorkerService extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private results: Map<string, WorkerResult> = new Map();
  private connectedClients: Set<WebSocket> = new Set();
  
  private readonly MAX_WORKERS = 8;
  private readonly MAX_RETRIES = 3;
  
  constructor() {
    super();
    this.initializeWorkers();
    this.startQueueProcessor();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      const worker = new Worker(`worker-${i}`);
      this.workers.set(worker.id, worker);
    }
  }

  addClient(ws: WebSocket) {
    this.connectedClients.add(ws);
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });
  }

  private broadcastWorkerStatus() {
    const status = {
      activeWorkers: this.workers.size,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      completedTasks: this.results.size
    };

    const message = JSON.stringify({
      type: 'worker_status',
      data: status
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async enqueueTask(task: Omit<WorkerTask, 'id' | 'createdAt' | 'retries'>): Promise<string> {
    const fullTask: WorkerTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      retries: 0
    };

    // Insert based on priority
    const insertIndex = this.findInsertionIndex(fullTask.priority);
    this.taskQueue.splice(insertIndex, 0, fullTask);
    
    this.broadcastWorkerStatus();
    return fullTask.id;
  }

  private findInsertionIndex(priority: WorkerTask['priority']): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const taskPriority = priorityOrder[priority];
    
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (priorityOrder[this.taskQueue[i].priority] < taskPriority) {
        return i;
      }
    }
    return this.taskQueue.length;
  }

  private async startQueueProcessor() {
    setInterval(async () => {
      await this.processQueue();
    }, 1000); // Process queue every second
  }

  private async processQueue() {
    if (this.taskQueue.length === 0) return;

    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => !worker.busy);

    if (availableWorkers.length === 0) return;

    const tasksToProcess = Math.min(availableWorkers.length, this.taskQueue.length);
    
    for (let i = 0; i < tasksToProcess; i++) {
      const task = this.taskQueue.shift()!;
      const worker = availableWorkers[i];
      
      this.activeTasks.set(task.id, task);
      worker.busy = true;
      
      // Process task asynchronously
      this.processTask(worker, task).catch(error => {
        console.error(`Task ${task.id} failed:`, error);
      });
    }
    
    this.broadcastWorkerStatus();
  }

  private async processTask(worker: Worker, task: WorkerTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (task.type) {
        case 'market_analysis':
          result = await this.performMarketAnalysis(task.payload);
          break;
        case 'news_correlation':
          result = await this.performNewsCorrelation(task.payload);
          break;
        case 'pattern_matching':
          result = await this.performPatternMatching(task.payload);
          break;
        case 'sentiment_analysis':
          result = await this.performSentimentAnalysis(task.payload);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      const workerResult: WorkerResult = {
        taskId: task.id,
        result,
        duration,
        success: true
      };

      this.results.set(task.id, workerResult);
      this.activeTasks.delete(task.id);
      worker.busy = false;

      // Broadcast result to clients
      this.broadcastTaskResult(workerResult);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const workerResult: WorkerResult = {
        taskId: task.id,
        result: null,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Retry logic
      if (task.retries < this.MAX_RETRIES) {
        task.retries++;
        this.taskQueue.unshift(task); // Add back to front of queue
      } else {
        this.results.set(task.id, workerResult);
        this.activeTasks.delete(task.id);
      }
      
      worker.busy = false;
    }
    
    this.broadcastWorkerStatus();
  }

  private async performMarketAnalysis(payload: any): Promise<any> {
    const { symbol, timeframe } = payload;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Mock analysis without vector store dependency for now
    const ragAnalysis = {
      marketContext: `Deep analysis of ${symbol} shows strong institutional interest`,
      newsCorrelation: 85,
      socialSentiment: 72,
      technicalSignals: ['Bullish momentum', 'Volume accumulation'],
      confidenceScore: 89,
      supportingEvidence: ['Whale accumulation detected', 'Positive news correlation']
    };
    
    return {
      symbol,
      timeframe,
      analysis: ragAnalysis,
      timestamp: new Date().toISOString(),
      processingTime: '2.3s'
    };
  }

  private async performNewsCorrelation(payload: any): Promise<any> {
    const { symbol, newsItems } = payload;
    
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    const correlations = newsItems.map((news: any) => ({
      newsId: news.id,
      title: news.title,
      correlation: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
      impact: Math.random() > 0.5 ? 'positive' : 'negative'
    }));
    
    return {
      symbol,
      correlations,
      overallSentiment: correlations.reduce((sum, c) => sum + c.correlation, 0) / correlations.length,
      timestamp: new Date().toISOString()
    };
  }

  private async performPatternMatching(payload: any): Promise<any> {
    const { symbol, priceData } = payload;
    
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    const patterns = [
      {
        name: 'Bull Flag Formation',
        confidence: 0.89,
        timeframe: '4H',
        target: '$52,000',
        probability: 0.76
      },
      {
        name: 'Ascending Triangle',
        confidence: 0.72,
        timeframe: '1D',
        target: '$48,500',
        probability: 0.68
      }
    ];
    
    return {
      symbol,
      patterns,
      historicalAccuracy: 0.84,
      timestamp: new Date().toISOString()
    };
  }

  private async performSentimentAnalysis(payload: any): Promise<any> {
    const { symbol, sources } = payload;
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const sentimentScores = {
      twitter: Math.random() * 0.6 + 0.2,
      reddit: Math.random() * 0.6 + 0.2,
      news: Math.random() * 0.6 + 0.2,
      onchain: Math.random() * 0.6 + 0.2
    };
    
    const overallSentiment = Object.values(sentimentScores)
      .reduce((sum, score) => sum + score, 0) / Object.keys(sentimentScores).length;
    
    return {
      symbol,
      sentimentScores,
      overallSentiment,
      trend: overallSentiment > 0.6 ? 'bullish' : overallSentiment < 0.4 ? 'bearish' : 'neutral',
      confidence: Math.random() * 0.3 + 0.7,
      timestamp: new Date().toISOString()
    };
  }

  private broadcastTaskResult(result: WorkerResult) {
    const message = JSON.stringify({
      type: 'worker_result',
      data: result
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getTaskResult(taskId: string): WorkerResult | undefined {
    return this.results.get(taskId);
  }

  getQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.busy).length,
      totalWorkers: this.workers.size,
      activeTasks: this.activeTasks.size,
      completedTasks: this.results.size
    };
  }
}

class Worker {
  public id: string;
  public busy: boolean = false;
  
  constructor(id: string) {
    this.id = id;
  }
}

export const asyncWorkerService = new AsyncWorkerService();