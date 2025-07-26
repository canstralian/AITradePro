import { storage } from "../storage";

export interface VectorEmbedding {
  id: string;
  contentHash: string;
  embedding: number[];
  contentType: 'news' | 'social' | 'onchain' | 'technical';
  sourceData: any;
  timestamp: Date;
}

export interface ContextualAnalysis {
  marketContext: string;
  newsCorrelation: number;
  socialSentiment: number;
  technicalSignals: string[];
  confidenceScore: number;
  supportingEvidence: string[];
}

export class VectorStoreService {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  
  constructor() {
    this.initializeEmbeddings();
  }

  private initializeEmbeddings() {
    // Initialize with sample contextual data
    const sampleEmbeddings = [
      {
        id: 'emb-1',
        contentHash: 'btc-bullish-sentiment-2024',
        embedding: this.generateMockEmbedding(),
        contentType: 'news' as const,
        sourceData: {
          title: 'Institutional Bitcoin Adoption Accelerates',
          content: 'Major corporations continue adding Bitcoin to treasury reserves',
          source: 'Financial Times',
          impact: 'high'
        },
        timestamp: new Date()
      },
      {
        id: 'emb-2', 
        contentHash: 'eth-upgrade-narrative',
        embedding: this.generateMockEmbedding(),
        contentType: 'technical' as const,
        sourceData: {
          title: 'Ethereum Scaling Solutions Show Growth',
          content: 'Layer 2 transaction volumes increase 300% quarter over quarter',
          metrics: { l2Volume: 15000000, growthRate: 3.0 }
        },
        timestamp: new Date()
      }
    ];

    sampleEmbeddings.forEach(emb => {
      this.embeddings.set(emb.id, emb);
    });
  }

  private generateMockEmbedding(): number[] {
    // Generate 384-dimensional mock embedding (like sentence-transformers)
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async performRAGAnalysis(query: string, assetSymbol: string): Promise<ContextualAnalysis> {
    // Generate query embedding (in real implementation, use OpenAI/HuggingFace)
    const queryEmbedding = this.generateMockEmbedding();
    
    // Find relevant context through vector similarity
    const relevantContext = Array.from(this.embeddings.values())
      .map(emb => ({
        embedding: emb,
        similarity: this.cosineSimilarity(queryEmbedding, emb.embedding)
      }))
      .filter(item => item.similarity > 0.7) // Similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 most relevant

    // Aggregate contextual insights
    const newsItems = relevantContext.filter(item => 
      item.embedding.contentType === 'news'
    );
    
    const technicalItems = relevantContext.filter(item => 
      item.embedding.contentType === 'technical'
    );

    // Calculate correlation scores
    const newsCorrelation = newsItems.length > 0 
      ? newsItems.reduce((sum, item) => sum + item.similarity, 0) / newsItems.length
      : 0;

    const socialSentiment = this.calculateSocialSentiment(assetSymbol);
    
    // Generate contextual analysis
    const analysis: ContextualAnalysis = {
      marketContext: this.generateMarketContext(relevantContext, assetSymbol),
      newsCorrelation: Math.round(newsCorrelation * 100),
      socialSentiment: Math.round(socialSentiment * 100),
      technicalSignals: this.extractTechnicalSignals(technicalItems),
      confidenceScore: this.calculateConfidenceScore(relevantContext),
      supportingEvidence: relevantContext.map(item => 
        item.embedding.sourceData.title || 'Market correlation detected'
      )
    };

    return analysis;
  }

  private generateMarketContext(context: any[], symbol: string): string {
    if (context.length === 0) {
      return `No significant contextual factors detected for ${symbol} at this time.`;
    }

    const newsCount = context.filter(item => item.embedding.contentType === 'news').length;
    const technicalCount = context.filter(item => item.embedding.contentType === 'technical').length;
    
    let contextStr = `Analysis for ${symbol} reveals `;
    
    if (newsCount > 0) {
      contextStr += `${newsCount} relevant news correlations with strong institutional sentiment. `;
    }
    
    if (technicalCount > 0) {
      contextStr += `${technicalCount} technical patterns suggest continued momentum. `;
    }
    
    contextStr += `Vector similarity analysis indicates high confidence in current trend direction.`;
    
    return contextStr;
  }

  private calculateSocialSentiment(symbol: string): number {
    // Mock social sentiment calculation (in real implementation, analyze Twitter/Reddit)
    const sentimentScores = {
      'BTC': 0.75,
      'ETH': 0.68,
      'SOL': 0.82,
      'ADA': 0.45
    };
    
    return sentimentScores[symbol as keyof typeof sentimentScores] || 0.5;
  }

  private extractTechnicalSignals(technicalItems: any[]): string[] {
    const signals = [
      'Bullish divergence on RSI',
      'Volume profile shows accumulation',
      'Breaking above key resistance',
      'Fibonacci retracement support holding'
    ];
    
    return signals.slice(0, Math.min(technicalItems.length + 1, signals.length));
  }

  private calculateConfidenceScore(context: any[]): number {
    if (context.length === 0) return 0;
    
    const avgSimilarity = context.reduce((sum, item) => sum + item.similarity, 0) / context.length;
    const diversityBonus = Math.min(context.length / 5, 1) * 0.2; // Bonus for diverse sources
    
    return Math.round((avgSimilarity + diversityBonus) * 100);
  }

  async addContextualData(contentType: VectorEmbedding['contentType'], data: any): Promise<void> {
    const contentHash = `${contentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const embedding: VectorEmbedding = {
      id: `emb-${Date.now()}`,
      contentHash,
      embedding: this.generateMockEmbedding(), // In real app: await this.generateEmbedding(data)
      contentType,
      sourceData: data,
      timestamp: new Date()
    };
    
    this.embeddings.set(embedding.id, embedding);
    
    // Keep only last 1000 embeddings to manage memory
    if (this.embeddings.size > 1000) {
      const oldestKey = Array.from(this.embeddings.keys())[0];
      this.embeddings.delete(oldestKey);
    }
  }
}

export const vectorStoreService = new VectorStoreService();