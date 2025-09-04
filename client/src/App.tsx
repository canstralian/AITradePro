import { Route, Switch } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useIsMobile } from "./hooks/use-mobile"
import { ErrorBoundary } from "./components/ErrorBoundary"
import Dashboard from "./pages/dashboard"
import NotFound from "./pages/not-found"
import "./index.css"

const queryClient = new QueryClient()

function App() {
  const isMobile = useIsMobile()

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className={`min-h-screen bg-background text-foreground ${isMobile ? 'overflow-x-hidden' : ''}`}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}