import { useState, useEffect } from 'react';
import { Settings, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery } from '@tanstack/react-query';

interface WorkerStatus {
  activeWorkers: number;
  queueLength: number;
  activeTasks: number;
  completedTasks: number;
}

interface TaskResult {
  taskId: string;
  result: any;
  duration: number;
  success: boolean;
  error?: string;
}

export default function WorkerQueue() {
  const [selectedTaskType, setSelectedTaskType] = useState('market_analysis');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [queuedTasks, setQueuedTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskResult[]>([]);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>({
    activeWorkers: 0,
    queueLength: 0,
    activeTasks: 0,
    completedTasks: 0
  });

  const { subscribe, sendMessage } = useWebSocket();

  // Fetch initial worker status
  const { data: statusData } = useQuery({
    queryKey: ['/api/workers/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (statusData) {
      setWorkerStatus(statusData);
    }
  }, [statusData]);

  useEffect(() => {
    // Subscribe to worker status updates
    const unsubscribeStatus = subscribe('worker_status', (data: WorkerStatus) => {
      setWorkerStatus(data);
    });

    // Subscribe to task results
    const unsubscribeResults = subscribe('worker_result', (data: TaskResult) => {
      setCompletedTasks(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 results
    });

    return () => {
      unsubscribeStatus();
      unsubscribeResults();
    };
  }, [subscribe]);

  const enqueueTask = async () => {
    const payload = {
      symbol: selectedSymbol,
      timeframe: '1D',
      newsItems: [],
      priceData: []
    };

    try {
      const response = await fetch('/api/workers/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedTaskType,
          payload,
          priority: 'medium'
        })
      });

      const data = await response.json();
      
      if (data.taskId) {
        setQueuedTasks(prev => [data.taskId, ...prev]);
      }
    } catch (error) {
      console.error('Failed to enqueue task:', error);
    }
  };

  const getTaskTypeName = (type: string) => {
    const names: Record<string, string> = {
      market_analysis: 'Market Analysis',
      news_correlation: 'News Correlation',
      pattern_matching: 'Pattern Matching',
      sentiment_analysis: 'Sentiment Analysis'
    };
    return names[type] || type;
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 trading-secondary" />
    ) : (
      <AlertCircle className="w-4 h-4 trading-accent" />
    );
  };

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Settings className="trading-primary mr-2 w-5 h-5" />
          Async Worker Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Worker Status Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="trading-bg rounded-lg p-3">
              <div className="text-xs trading-muted">Active Workers</div>
              <div className="text-lg font-mono font-bold trading-secondary">
                {workerStatus.activeWorkers}/8
              </div>
            </div>
            <div className="trading-bg rounded-lg p-3">
              <div className="text-xs trading-muted">Queue Length</div>
              <div className="text-lg font-mono font-bold">
                {workerStatus.queueLength}
              </div>
            </div>
          </div>

          {/* Task Enqueue */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
                <SelectTrigger className="flex-1 trading-bg border-trading-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="trading-panel border-trading-border">
                  <SelectItem value="market_analysis">Market Analysis</SelectItem>
                  <SelectItem value="news_correlation">News Correlation</SelectItem>
                  <SelectItem value="pattern_matching">Pattern Matching</SelectItem>
                  <SelectItem value="sentiment_analysis">Sentiment Analysis</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-20 trading-bg border-trading-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="trading-panel border-trading-border">
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={enqueueTask}
                className="bg-trading-primary hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Queue
              </Button>
            </div>
          </div>

          {/* Recent Task Results */}
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Results</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <div key={task.taskId} className="trading-bg rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(task.success)}
                        <span className="text-sm font-medium">
                          {getTaskTypeName(task.result?.symbol || 'Unknown')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {task.duration}ms
                        </Badge>
                        <Clock className="w-3 h-3 trading-muted" />
                      </div>
                    </div>
                    {task.success && task.result && (
                      <div className="text-xs trading-muted">
                        {task.result.analysis?.confidenceScore && (
                          <span>Confidence: {task.result.analysis.confidenceScore}%</span>
                        )}
                        {task.result.overallSentiment && (
                          <span>Sentiment: {(task.result.overallSentiment * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    )}
                    {!task.success && (
                      <div className="text-xs trading-accent">
                        Error: {task.error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Settings className="w-8 h-8 trading-muted mx-auto mb-2" />
                  <p className="text-xs trading-muted">No completed tasks yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="border-t border-trading-border pt-3">
            <div className="text-xs trading-muted space-y-1">
              <div className="flex justify-between">
                <span>Active Tasks:</span>
                <span>{workerStatus.activeTasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span>{workerStatus.completedTasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Rate:</span>
                <span>~2.3 tasks/min</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}