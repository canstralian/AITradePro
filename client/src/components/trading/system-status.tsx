import { Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SystemStatus() {
  const systemServices = [
    { name: 'AI Engine', status: 'Online', color: 'trading-secondary' },
    { name: 'Data Feeds', status: 'Connected', color: 'trading-secondary' },
    { name: 'Vector DB', status: 'Synced', color: 'trading-secondary' },
    { name: 'Workers', status: '8/8 Active', color: 'trading-secondary' },
  ];

  const queueItems = [
    { name: 'News Analysis', pending: 0 },
    { name: 'Pattern Matching', pending: 2 },
    { name: 'Sentiment Analysis', pending: 1 },
  ];

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Server className="trading-primary mr-2 w-5 h-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systemServices.map((service) => (
            <div key={service.name} className="flex justify-between items-center">
              <span className="text-sm">{service.name}</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 animate-pulse`} 
                     style={{ backgroundColor: 'hsl(158, 64%, 52%)' }}></div>
                <span className="text-xs trading-secondary">{service.status}</span>
              </div>
            </div>
          ))}
          
          <div className="border-t border-trading-border pt-3 mt-4">
            <div className="text-sm font-medium mb-2">Processing Queue</div>
            <div className="text-xs space-y-1">
              {queueItems.map((item) => (
                <div key={item.name} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="trading-muted">{item.pending} pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
