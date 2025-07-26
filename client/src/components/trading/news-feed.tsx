import { Newspaper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewsItem } from '@/types/trading';

interface NewsFeedProps {
  news: NewsItem[];
}

export default function NewsFeed({ news }: NewsFeedProps) {
  // Default news data if none provided
  const defaultNews = [
    {
      id: '1',
      title: 'Bitcoin ETF Approval Expected Soon',
      summary: 'Market analysts predict potential approval could drive BTC to new highs...',
      source: 'CoinDesk',
      impact: 'high',
      sentiment: 'positive',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Ethereum Layer 2 Adoption Surges',
      summary: 'Transaction volume on L2 networks increased 340% this quarter...',
      source: 'The Block',
      impact: 'medium',
      sentiment: 'positive',
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'DeFi Protocol Launches New Yield Strategy',
      summary: 'New automated strategy promises 12% APY with reduced risk...',
      source: 'DeFi Pulse',
      impact: 'low',
      sentiment: 'positive',
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  const displayNews = news.length > 0 ? news : defaultNews;

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    return `${diffInHours} hours ago`;
  };

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Newspaper className="trading-primary mr-2 w-5 h-5" />
          Market News
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
          {displayNews.map((item) => (
            <div key={item.id} className="border-b border-trading-border pb-3 last:border-0">
              <h4 className="text-sm font-medium mb-1">{item.title}</h4>
              <p className="text-xs trading-muted mb-2">{item.summary}</p>
              <div className="flex justify-between text-xs trading-muted">
                <span>{item.source}</span>
                <span>{getTimeAgo(item.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
