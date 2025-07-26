import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PatternMatching() {
  const patterns = [
    {
      id: '1',
      title: 'Similar Pattern Found',
      match: '92% Match',
      period: 'October 2020 - Bull Run Formation',
      duration: '47 days',
      gain: '+312%',
      confidence: 'High',
      variant: 'secondary' as const,
    },
    {
      id: '2',
      title: 'Alternative Pattern',
      match: '76% Match',
      period: 'March 2019 - Gradual Recovery',
      duration: '89 days',
      gain: '+145%',
      confidence: 'Medium',
      variant: 'default' as const,
    },
  ];

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Search className="trading-primary mr-2 w-5 h-5" />
          Historical Pattern Matching
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="trading-bg rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{pattern.title}</span>
                <Badge variant={pattern.variant} className="text-xs">
                  {pattern.match}
                </Badge>
              </div>
              <p className="text-xs trading-muted mb-2">{pattern.period}</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-mono">{pattern.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gain:</span>
                  <span className="font-mono trading-secondary">{pattern.gain}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-mono">{pattern.confidence}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
