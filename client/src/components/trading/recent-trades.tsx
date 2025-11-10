import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/types/trading';

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  // Default trades data if none provided
  const defaultTrades = [
    {
      id: '1',
      symbol: 'BTC',
      type: 'buy' as const,
      quantity: '0.023',
      price: '43247.89',
      totalValue: '992.34',
      executedAt: new Date().toISOString(),
    },
    {
      id: '2',
      symbol: 'ETH',
      type: 'sell' as const,
      quantity: '1.247',
      price: '2847.21',
      totalValue: '2847.21',
      executedAt: new Date().toISOString(),
    },
    {
      id: '3',
      symbol: 'SOL',
      type: 'buy' as const,
      quantity: '25.6',
      price: '98.45',
      totalValue: '1536.70',
      executedAt: new Date().toISOString(),
    },
  ];

  const displayTrades = trades.length > 0 ? trades : defaultTrades;

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {displayTrades.map(trade => (
            <div
              key={trade.id}
              className="flex justify-between items-center py-2 border-b border-trading-border last:border-0"
            >
              <div>
                <span className="font-medium">{trade.symbol}</span>
                <span
                  className={`ml-2 text-xs px-2 py-1 rounded ${
                    trade.type === 'buy'
                      ? 'bg-trading-secondary/20 trading-secondary'
                      : 'bg-trading-accent/20 trading-accent'
                  }`}
                >
                  {trade.type.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  {trade.quantity} {trade.symbol}
                </div>
                <div className="text-xs trading-muted">
                  ${parseFloat(trade.totalValue).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
