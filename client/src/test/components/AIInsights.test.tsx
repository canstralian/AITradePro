import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AIInsights from '@/components/trading/ai-insights'
import { AIInsight } from '@/types/trading'

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'sentiment',
    title: 'Market Sentiment',
    description: 'Strong bullish sentiment detected',
    confidence: '89',
    metadata: { status: 'Bullish' },
    timestamp: '2025-07-26T12:00:00Z',
  },
  {
    id: '2',
    type: 'pattern',
    title: 'Pattern Recognition',
    description: 'Bull flag formation identified',
    confidence: '76',
    metadata: { pattern: 'Bull Flag' },
    timestamp: '2025-07-26T12:05:00Z',
  }
]

describe('AIInsights Component', () => {
  it('renders AI Insights header', () => {
    render(<AIInsights insights={[]} />)
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
  })

  it('displays insights when provided', () => {
    render(<AIInsights insights={mockInsights} />)
    
    expect(screen.getByText('Market Sentiment')).toBeInTheDocument()
    expect(screen.getByText('Strong bullish sentiment detected')).toBeInTheDocument()
    expect(screen.getByText('89% confidence')).toBeInTheDocument()
    
    expect(screen.getByText('Pattern Recognition')).toBeInTheDocument()
    expect(screen.getByText('Bull flag formation identified')).toBeInTheDocument()
    expect(screen.getByText('76% confidence')).toBeInTheDocument()
  })

  it('shows default insights when no data provided', () => {
    render(<AIInsights insights={[]} />)
    
    expect(screen.getByText('Market Sentiment')).toBeInTheDocument()
    expect(screen.getByText('Pattern Match')).toBeInTheDocument()
    expect(screen.getByText('News Impact')).toBeInTheDocument()
  })

  it('displays correct badge variants for different insight types', () => {
    render(<AIInsights insights={mockInsights} />)
    
    // Check that sentiment badges are displayed (shows metadata.status or type)
    expect(screen.getByText('Bullish')).toBeInTheDocument()
    expect(screen.getByText('pattern')).toBeInTheDocument()
    
    // Check description content is shown
    expect(screen.getByText('Bull flag formation identified')).toBeInTheDocument()
  })
})