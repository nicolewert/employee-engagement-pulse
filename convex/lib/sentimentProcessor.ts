import { ClaudeAPIClient, SentimentAnalysisResult, BatchSentimentRequest } from './claudeAPIClient'
import { Doc } from '../_generated/dataModel'

export interface ProcessingStats {
  processed: number
  failed: number
  totalTime: number
  errors: string[]
}

export class SentimentProcessor {
  private client: ClaudeAPIClient
  private batchSize: number = 50 // Process up to 50 messages per API call

  constructor(apiKey?: string) {
    this.client = new ClaudeAPIClient(apiKey)
  }

  async processBatch(messages: Doc<'messages'>[]): Promise<{
    results: SentimentAnalysisResult[]
    stats: ProcessingStats
  }> {
    const startTime = Date.now()
    const stats: ProcessingStats = {
      processed: 0,
      failed: 0,
      totalTime: 0,
      errors: []
    }

    if (messages.length === 0) {
      stats.totalTime = Date.now() - startTime
      return { results: [], stats }
    }

    // Filter out messages that are too short or empty
    const validMessages = messages.filter(msg => 
      msg.text && 
      msg.text.trim().length > 0 && 
      !msg.sentimentProcessed &&
      !msg.isDeleted
    )

    if (validMessages.length === 0) {
      stats.totalTime = Date.now() - startTime
      return { results: [], stats }
    }

    // Split into batches for API processing
    const batches = this.createBatches(validMessages)
    const allResults: SentimentAnalysisResult[] = []

    for (const batch of batches) {
      try {
        const request: BatchSentimentRequest = {
          messages: batch.map(msg => ({
            id: msg._id,
            text: msg.text,
            username: msg.username,
            timestamp: msg.timestamp
          }))
        }

        const batchResults = await this.client.analyzeSentimentBatch(request)
        allResults.push(...batchResults)
        stats.processed += batchResults.length

        // Small delay between batches to avoid rate limiting
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        stats.errors.push(`Batch processing failed: ${errorMessage}`)
        stats.failed += batch.length
        
        // Add fallback neutral scores for failed batch
        const fallbackResults = batch.map(msg => ({
          messageId: msg._id,
          sentimentScore: 0,
          confidence: 0.1,
          reasoning: 'Processing failed, assigned neutral score'
        }))
        allResults.push(...fallbackResults)
      }
    }

    stats.totalTime = Date.now() - startTime
    return { results: allResults, stats }
  }

  private createBatches(messages: Doc<'messages'>[]): Doc<'messages'>[][] {
    const batches: Doc<'messages'>[][] = []
    
    for (let i = 0; i < messages.length; i += this.batchSize) {
      batches.push(messages.slice(i, i + this.batchSize))
    }
    
    return batches
  }

  async processUnanalyzedMessages(
    getUnprocessedMessages: () => Promise<Doc<'messages'>[]>,
    updateSentiment: (messageId: string, score: number) => Promise<void>
  ): Promise<ProcessingStats> {
    const messages = await getUnprocessedMessages()
    const { results, stats } = await this.processBatch(messages)

    // Update database with sentiment scores
    for (const result of results) {
      try {
        await updateSentiment(result.messageId, result.sentimentScore)
      } catch (error) {
        stats.errors.push(`Failed to update message ${result.messageId}: ${error}`)
        stats.failed++
        stats.processed-- // Don't count as processed if update failed
      }
    }

    return stats
  }

  setBatchSize(size: number): void {
    if (size < 1 || size > 100) {
      throw new Error('Batch size must be between 1 and 100')
    }
    this.batchSize = size
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.testConnection()
    } catch (error) {
      console.error('SentimentProcessor health check failed:', error)
      return false
    }
  }
}

export const createSentimentProcessor = (apiKey?: string): SentimentProcessor => {
  return new SentimentProcessor(apiKey)
}