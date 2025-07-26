import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { MarketData } from '@/types/trading';

interface PriceChartProps {
  symbol: string;
  price: string;
  priceChange: string;
  marketData?: MarketData;
}

export default function PriceChart({ symbol, price, priceChange, marketData }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState('1D');
  
  // Generate mock chart data
  const generateChartData = () => {
    const data = [];
    const basePrice = parseFloat(price.replace(/,/g, ''));
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * basePrice * 0.02;
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: basePrice + variation,
      });
    }
    return data;
  };

  const chartData = generateChartData();
  const isPositive = parseFloat(priceChange) >= 0;

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{symbol}</CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 trading-bg border-trading-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="trading-panel border-trading-border">
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="4H">4H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">${price}</div>
              <div className={`text-sm ${isPositive ? 'trading-secondary' : 'trading-accent'}`}>
                {isPositive ? '+' : ''}{priceChange}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
              />
              <YAxis 
                hide
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(217, 33%, 17%)',
                  border: '1px solid hsl(217, 33%, 33%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? 'hsl(158, 64%, 52%)' : 'hsl(0, 84%, 60%)'}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: isPositive ? 'hsl(158, 64%, 52%)' : 'hsl(0, 84%, 60%)'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
