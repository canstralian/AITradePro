import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  Search,
  Settings,
  User,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function TradingHeader() {
  const isMobile = useIsMobile();

  return (
    <header
      className={`flex items-center justify-between border-b trading-border trading-panel ${isMobile ? 'h-12 px-3' : 'h-16 px-6'}`}
    >
      {/* Market Status */}
      <div
        className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-6'}`}
      >
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span
            className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium trading-text`}
          >
            {isMobile ? 'Open' : 'Market Open'}
          </span>
        </div>

        {!isMobile && (
          <>
            <div className="flex items-center space-x-4">
              <div className="text-sm trading-muted">S&P 500</div>
              <div className="flex items-center space-x-1">
                <span className="font-medium trading-text">4,127.83</span>
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-sm text-green-400">+0.8%</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm trading-muted">NASDAQ</div>
              <div className="flex items-center space-x-1">
                <span className="font-medium trading-text">12,834.87</span>
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span className="text-sm text-red-400">-0.3%</span>
              </div>
            </div>
          </>
        )}

        {isMobile && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium trading-text">4,127</span>
              <TrendingUp className="h-2 w-2 text-green-400" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium trading-text">12,834</span>
              <TrendingDown className="h-2 w-2 text-red-400" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-4'}`}
      >
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="trading-text hover:trading-accent"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size={isMobile ? 'sm' : 'icon'}
          className="trading-text hover:trading-accent relative"
        >
          <Bell className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
          <Badge
            className={`absolute bg-red-600 text-white text-xs p-0 flex items-center justify-center ${isMobile ? '-top-1 -right-1 h-3 w-3 rounded-full' : '-top-2 -right-2 h-5 w-5 rounded-full'}`}
          >
            {isMobile ? '' : '3'}
          </Badge>
        </Button>

        {!isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="trading-text hover:trading-accent"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="trading-text hover:trading-accent"
            >
              <User className="h-4 w-4" />
            </Button>
          </>
        )}

        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="trading-text hover:trading-accent"
          >
            <User className="h-3 w-3" />
          </Button>
        )}
      </div>
    </header>
  );
}
