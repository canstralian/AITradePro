import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIInsight } from '@/types/trading';

interface AIInsightsProps {
  insights: AIInsight[];
}

export default function AIInsights({ insights }: AIInsightsProps) {
  const getInsightBadgeVariant = (type: string) => {
    switch (type) {
      case 'sentiment':
        return 'secondary';
      case 'pattern':
        return 'default';
      case 'news':
        return 'outline';
      default:
        return 'default';
    }
  };

  const defaultInsights = [
    {
      id: '1',
      type: 'sentiment' as const,
      title: 'Market Sentiment',
      description: 'Strong accumulation detected. Whale activity increased 34% in last 4 hours.',
      confidence: '89',
      metadata: { status: 'Bullish' },
      timestamp: new Date().toISOString(),
    },
    {
      id: '2', 
      type: 'pattern' as const,
      title: 'Pattern Match',
      description: 'Similar to Oct 2020 breakout pattern. Expected target: $48,500',
      confidence: '92',
      metadata: { similarity: '89%' },
      timestamp: new Date().toISOString(),
    },
    {
      id: '3',
      type: 'news' as const,
      title: 'News Impact',
      description: 'Positive ETF news correlation. Social sentiment up 23%.',
      confidence: '76',
      metadata: { impact: 'Medium' },
      timestamp: new Date().toISOString(),
    }
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Brain className="trading-primary mr-2 w-5 h-5" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayInsights.map((insight, index) => (
            <div key={`insight-${index}-${insight.timestamp.getTime()}`} className="trading-bg rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{insight.title}</span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getInsightBadgeVariant(insight.type)}
                    className="text-xs"
                  >
                    {insight.metadata?.status || insight.type}
                  </Badge>
                  <span className="text-xs trading-secondary">
                    {insight.confidence}% confidence
                  </span>
                </div>
              </div>
              <p className="text-sm trading-muted">{insight.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}