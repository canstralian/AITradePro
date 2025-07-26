import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderBookProps {
  symbol: string;
}

export default function OrderBook({ symbol }: OrderBookProps) {
  // Generate mock order book data
  const generateOrderBookData = () => {
    const basePrice = 43247.89;
    const bids = [];
    const asks = [];
    
    // Generate bids (buy orders) - decreasing prices
    for (let i = 0; i < 8; i++) {
      bids.push({
        price: (basePrice - (i + 1) * Math.random() * 10).toFixed(2),
        quantity: (Math.random() * 2 + 0.1).toFixed(3),
      });
    }
    
    // Generate asks (sell orders) - increasing prices
    for (let i = 0; i < 8; i++) {
      asks.push({
        price: (basePrice + (i + 1) * Math.random() * 10).toFixed(2),
        quantity: (Math.random() * 2 + 0.1).toFixed(3),
      });
    }
    
    return { bids, asks };
  };

  const { bids, asks } = generateOrderBookData();

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Order Book</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm trading-muted mb-2 font-medium">Bids</div>
            <div className="space-y-1">
              {bids.slice(0, 6).map((bid, index) => (
                <div key={index} className="flex justify-between text-xs font-mono">
                  <span className="trading-secondary">{bid.price}</span>
                  <span className="trading-muted">{bid.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm trading-muted mb-2 font-medium">Asks</div>
            <div className="space-y-1">
              {asks.slice(0, 6).map((ask, index) => (
                <div key={index} className="flex justify-between text-xs font-mono">
                  <span className="trading-accent">{ask.price}</span>
                  <span className="trading-muted">{ask.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
