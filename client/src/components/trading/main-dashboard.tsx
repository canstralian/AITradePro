import { TrendingUp, TrendingDown, BarChart3, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PriceChart from './price-chart';
import AIInsights from './ai-insights';
import OrderBook from './order-book';
import PortfolioChart from './portfolio-chart';
import RecentTrades from './recent-trades';
import NewsFeed from './news-feed';
import MarketCorrelation from './market-correlation';
import PatternMatching from './pattern-matching';
import SystemStatus from './system-status';
import RAGAnalysis from './rag-analysis';
import WorkerQueue from './worker-queue';
import { DashboardData, MarketData, AIInsight } from '@/types/trading';

import { useIsMobile } from '@/hooks/use-mobile';

interface MainDashboardProps {
  dashboardData?: DashboardData;
  marketData: Record<string, MarketData>;
  realtimeInsights: AIInsight[];
}

export default function MainDashboard({ 
  dashboardData, 
  marketData, 
  realtimeInsights 
}: MainDashboardProps) {
  const isMobile = useIsMobile();
  const portfolioValue = "127,543.21";
  const pnl24h = "+3,247.89";
  const activePositions = dashboardData?.positions?.length || 12;
  const aiConfidence = "87";

  const btcPrice = marketData.BTC?.price || "43,247.89";
  const btcChange = marketData.BTC?.priceChange24h || "2.34";

  return (
    <main className="flex-1 p-4 overflow-y-auto scrollbar-thin">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="trading-panel panel-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm trading-muted">Portfolio Value</p>
                <p className="text-2xl font-bold font-mono">${portfolioValue}</p>
                <p className="text-sm trading-secondary">+$2,431.05 (1.94%)</p>
              </div>
              <TrendingUp className="text-trading-secondary w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="trading-panel panel-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm trading-muted">24h P&L</p>
                <p className="text-2xl font-bold font-mono trading-secondary">${pnl24h}</p>
                <p className="text-sm trading-secondary">+2.6%</p>
              </div>
              <BarChart3 className="text-trading-secondary w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="trading-panel panel-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm trading-muted">Active Positions</p>
                <p className="text-2xl font-bold font-mono">{activePositions}</p>
                <p className="text-sm trading-muted">Across 8 assets</p>
              </div>
              <TrendingUp className="text-trading-primary w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="trading-panel panel-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm trading-muted">AI Confidence</p>
                <p className="text-2xl font-bold font-mono">{aiConfidence}%</p>
                <p className="text-sm trading-secondary">High confidence</p>
              </div>
              <Brain className="text-trading-secondary w-8 h-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Price Chart - spans 2 columns */}
        <div className="lg:col-span-2">
          <PriceChart 
            symbol="BTC/USD"
            price={btcPrice}
            priceChange={btcChange}
            marketData={marketData.BTC}
          />
        </div>

        {/* AI Insights */}
        <AIInsights 
          insights={[...realtimeInsights, ...(dashboardData?.insights || [])].slice(0, 3)} 
        />

        {/* Order Book */}
        <OrderBook symbol="BTC" />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <PortfolioChart positions={dashboardData?.positions || []} />
        <RecentTrades trades={dashboardData?.trades || []} />
        <NewsFeed news={dashboardData?.news || []} />
        <MarketCorrelation />
      </div>

      {/* Enhanced Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RAGAnalysis symbol="BTC" />
        <WorkerQueue />
      </div>

      {/* Historical Pattern Matching */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PatternMatching />
        </div>
        <SystemStatus />
      </div>
    </main>
  );
}