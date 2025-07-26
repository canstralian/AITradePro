import { useState } from 'react';
import { Brain, Activity, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

interface RAGAnalysisProps {
  symbol: string;
}

interface ContextualAnalysis {
  marketContext: string;
  newsCorrelation: number;
  socialSentiment: number;
  technicalSignals: string[];
  confidenceScore: number;
  supportingEvidence: string[];
}

export default function RAGAnalysis({ symbol }: RAGAnalysisProps) {
  const [query, setQuery] = useState('');
  const [analysisResult, setAnalysisResult] = useState<ContextualAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const performRAGAnalysis = async () => {
    if (!query.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/rag-analysis/${symbol}?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (error) {
      console.error('RAG analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'trading-secondary';
    if (score >= 40) return 'text-yellow-500';
    return 'trading-accent';
  };

  return (
    <Card className="trading-panel panel-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Brain className="trading-primary mr-2 w-5 h-5" />
          RAG Contextual Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Query Input */}
          <div className="flex items-center space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask about ${symbol} market context, news correlation...`}
              className="flex-1 trading-panel border-trading-border"
              onKeyPress={(e) => e.key === 'Enter' && performRAGAnalysis()}
            />
            <Button 
              onClick={performRAGAnalysis}
              disabled={isAnalyzing || !query.trim()}
              className="bg-trading-primary hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-4">
              {/* Market Context */}
              <div className="trading-bg rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 trading-primary" />
                  Market Context
                </h4>
                <p className="text-sm trading-muted">{analysisResult.marketContext}</p>
              </div>

              {/* Correlation Scores */}
              <div className="grid grid-cols-2 gap-3">
                <div className="trading-bg rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">News Correlation</span>
                    <Badge variant="secondary" className="text-xs">
                      {analysisResult.newsCorrelation}%
                    </Badge>
                  </div>
                  <Progress value={analysisResult.newsCorrelation} className="h-2" />
                </div>

                <div className="trading-bg rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Social Sentiment</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getSentimentColor(analysisResult.socialSentiment)}`}
                    >
                      {analysisResult.socialSentiment}%
                    </Badge>
                  </div>
                  <Progress value={analysisResult.socialSentiment} className="h-2" />
                </div>
              </div>

              {/* Technical Signals */}
              <div className="trading-bg rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Technical Signals</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.technicalSignals.map((signal, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {signal}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Supporting Evidence */}
              <div className="trading-bg rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Supporting Evidence</h4>
                <ul className="text-xs trading-muted space-y-1">
                  {analysisResult.supportingEvidence.map((evidence, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-trading-secondary rounded-full mr-2"></span>
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confidence Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence Score</span>
                <div className="flex items-center space-x-2">
                  <Progress value={analysisResult.confidenceScore} className="w-20 h-2" />
                  <span className="text-sm font-mono trading-secondary">
                    {analysisResult.confidenceScore}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Default State */}
          {!analysisResult && !isAnalyzing && (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 trading-muted mx-auto mb-3" />
              <p className="text-sm trading-muted">
                Enter a query to perform contextual analysis using RAG technology
              </p>
              <p className="text-xs trading-muted mt-1">
                Correlates market data with news, social media, and on-chain signals
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}