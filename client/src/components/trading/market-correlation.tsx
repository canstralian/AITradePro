import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function MarketCorrelation() {
  const correlations = [
    { pair: 'BTC vs ETH', value: 84, color: 'trading-secondary' },
    { pair: 'BTC vs S&P 500', value: 23, color: 'trading-muted' },
    { pair: 'BTC vs Gold', value: 15, color: 'trading-accent', negative: true },
  ];

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Market Correlation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {correlations.map((correlation) => (
            <div key={correlation.pair} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">{correlation.pair}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-mono text-sm ${correlation.color}`}>
                    {correlation.negative ? '-' : ''}0.{correlation.value}
                  </span>
                </div>
              </div>
              <Progress 
                value={correlation.value} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
