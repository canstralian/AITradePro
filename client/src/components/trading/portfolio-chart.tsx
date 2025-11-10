import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Position } from '@/types/trading';

interface PortfolioChartProps {
  positions: Position[];
}

export default function PortfolioChart({ positions }: PortfolioChartProps) {
  // Default portfolio data if no positions
  const defaultData = [
    { name: 'Bitcoin', value: 45, color: 'hsl(217, 91%, 60%)' },
    { name: 'Ethereum', value: 25, color: 'hsl(158, 64%, 52%)' },
    { name: 'Solana', value: 15, color: 'hsl(0, 84%, 60%)' },
    { name: 'Cardano', value: 10, color: 'hsl(48, 96%, 53%)' },
    { name: 'Other', value: 5, color: 'hsl(215, 20%, 65%)' },
  ];

  // Convert positions to chart data or use default
  const chartData =
    positions.length > 0
      ? positions.map((position, index) => ({
          name: position.symbol || 'Unknown',
          value: parseFloat(position.totalValue) || 0,
          color:
            defaultData[index % defaultData.length]?.color ||
            'hsl(215, 20%, 65%)',
        }))
      : defaultData;

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Portfolio Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(217, 33%, 17%)',
                  border: '1px solid hsl(217, 33%, 33%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [`${value}%`, 'Allocation']}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '12px',
                  color: 'hsl(210, 40%, 98%)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
