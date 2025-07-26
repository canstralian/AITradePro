import { useState } from 'react';
import { Bot, Plus, Minus, BarChart3, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MarketData, AIInsight } from '@/types/trading';

interface SidebarProps {
  onAIQuery: (query: string) => void;
  marketData: Record<string, MarketData>;
  insights: AIInsight[];
}

export default function Sidebar({ onAIQuery, marketData, insights }: SidebarProps) {
  const [queryInput, setQueryInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      type: 'ai',
      message: 'Based on current market sentiment and on-chain data, Bitcoin shows strong accumulation patterns similar to Q4 2020. Correlation with tech stocks has decreased 15% this week.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      type: 'user', 
      message: "What's driving the current Bitcoin price movement?",
      timestamp: new Date(Date.now() - 6 * 60 * 1000)
    }
  ]);

  const handleQuerySubmit = () => {
    if (!queryInput.trim()) return;
    
    // Add user message to conversation
    setConversation(prev => [{
      type: 'user',
      message: queryInput,
      timestamp: new Date()
    }, ...prev]);
    
    // Send query to AI
    onAIQuery(queryInput);
    setQueryInput('');
  };

  const topMovers = [
    { symbol: 'SOL', change: '+12.4%', positive: true },
    { symbol: 'AVAX', change: '+8.9%', positive: true },
    { symbol: 'LUNA', change: '-5.2%', positive: false },
  ];

  return (
    <aside className="w-80 trading-panel border-r trading-border p-4 overflow-y-auto scrollbar-thin">
      {/* AI Assistant */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bot className="trading-primary mr-2 w-5 h-5" />
          AI Assistant
        </h3>
        
        <Card className="trading-bg panel-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Ask about market trends, patterns, or specific assets..."
                className="flex-1 trading-panel border-trading-border"
                onKeyPress={(e) => e.key === 'Enter' && handleQuerySubmit()}
              />
              <Button 
                onClick={handleQuerySubmit}
                size="sm"
                className="bg-trading-primary hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* AI Conversation */}
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              {conversation.map((item, index) => (
                <div 
                  key={index}
                  className={`${item.type === 'ai' ? 'trading-panel' : 'trading-bg'} rounded-lg p-3`}
                >
                  <div className="text-xs trading-muted mb-1">
                    {item.type === 'ai' ? 'AI Analysis' : 'You asked'}
                  </div>
                  <p className="text-sm">{item.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button className="bg-trading-secondary hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Quick Buy
          </Button>
          <Button className="bg-trading-accent hover:bg-red-700 text-white">
            <Minus className="w-4 h-4 mr-2" />
            Quick Sell
          </Button>
          <Button className="bg-trading-primary hover:bg-blue-700 text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyze
          </Button>
          <Button variant="outline" className="trading-panel border-trading-border">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
        <div className="space-y-3">
          <Card className="trading-bg panel-shadow">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Fear & Greed Index</span>
                <span className="trading-secondary font-mono">76</span>
              </div>
              <Progress value={76} className="mb-1" />
              <span className="text-xs trading-muted">Extreme Greed</span>
            </CardContent>
          </Card>
          
          <Card className="trading-bg panel-shadow">
            <CardContent className="p-3">
              <div className="text-sm font-medium mb-2">Top Movers</div>
              <div className="space-y-2 text-xs">
                {topMovers.map((mover) => (
                  <div key={mover.symbol} className="flex justify-between">
                    <span>{mover.symbol}</span>
                    <span className={mover.positive ? 'trading-secondary' : 'trading-accent'}>
                      {mover.change}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </aside>
  );
}
