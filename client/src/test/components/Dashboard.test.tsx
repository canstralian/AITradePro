import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../pages/dashboard';

// Mock the hooks
vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../hooks/use-websocket', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
    lastMessage: null,
    readyState: 1,
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('Dashboard', () => {
  it('renders without crashing', () => {
    renderWithQueryClient(<Dashboard />);

    // Check if main dashboard elements are present
    expect(screen.getByText('AI Trade Pro')).toBeInTheDocument();
  });

  it('displays trading components', () => {
    renderWithQueryClient(<Dashboard />);

    // These components should be rendered
    const elements = ['Portfolio Value', 'Recent Trades', 'AI Insights'];

    elements.forEach(text => {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    });
  });
});
