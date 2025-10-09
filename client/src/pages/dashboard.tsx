import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/trading/header';
import Sidebar from '@/components/trading/sidebar';
import MainDashboard from '@/components/trading/main-dashboard';
import { useWebSocket } from '@/hooks/use-websocket';
import { DashboardData, MarketData, AIInsight } from '@/types/trading';

export default function Dashboard() {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { subscribe, sendMessage } = useWebSocket();

  useEffect(() => {
    // Subscribe to price updates
    if (subscribe && typeof subscribe === 'function') {
      const unsubscribePrice = subscribe('price_update', data => {
        setMarketData(prev => ({
          ...prev,
          [data.symbol]: data,
        }));
      });

      // Subscribe to AI insights
      const unsubscribeInsights = subscribe('ai_insight', data => {
        setAiInsights(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 insights
      });

      return () => {
        if (unsubscribePrice && typeof unsubscribePrice === 'function') {
          unsubscribePrice();
        }
        if (unsubscribeInsights && typeof unsubscribeInsights === 'function') {
          unsubscribeInsights();
        }
      };
    }
  }, [subscribe]);

  const handleAIQuery = (query: string) => {
    sendMessage({
      type: 'ai_query',
      data: { query },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen trading-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-trading-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="trading-text">Loading trading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen trading-bg trading-text">
      <Header />

      <div className="flex h-screen pt-16">
        <Sidebar
          onAIQuery={handleAIQuery}
          marketData={marketData}
          insights={aiInsights}
        />

        <MainDashboard
          dashboardData={dashboardData}
          marketData={marketData}
          realtimeInsights={aiInsights}
        />
      </div>
    </div>
  );
}
