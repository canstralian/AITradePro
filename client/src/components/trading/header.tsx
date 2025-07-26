import { TrendingUp } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  user?: any;
}

export default function Header({ isConnected, user }: HeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 trading-panel border-b trading-border p-4 panel-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-trading-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold trading-text">AEI Trading Platform</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="trading-primary font-medium">Dashboard</a>
            <a href="#" className="trading-muted hover:text-trading-text transition-colors">Analytics</a>
            <a href="#" className="trading-muted hover:text-trading-text transition-colors">Portfolio</a>
            <a href="#" className="trading-muted hover:text-trading-text transition-colors">Settings</a>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 trading-bg px-3 py-2 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-trading-secondary animate-pulse' : 'bg-trading-accent'}`}></div>
            <span className="text-sm font-mono">
              {isConnected ? 'Live Market Data' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-trading-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-sm">{user?.username || 'Alex Chen'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
