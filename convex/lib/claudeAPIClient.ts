import { Anthropic } from '@anthropic-ai/sdk'

export interface SentimentAnalysisResult {
  messageId: string
  sentimentScore: number
  confidence: number
  reasoning?: string
}

export interface BatchSentimentRequest {
  messages: Array<{
    id: string
    text: string
    username: string
    timestamp: number
  }>
}

export class ClaudeAPIClient {
  public client: Anthropic
  private maxRetries: number = 3
  private baseDelay: number = 1000 // 1 second
  private isHealthy: boolean = true
  private lastHealthCheck: number = 0
  private healthCheckInterval: number = 60000 // 1 minute

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    try {
      this.client = new Anthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        timeout: 30000, // 30 second timeout
      })
    } catch (error) {
      console.error('Failed to initialize Claude client:', error)
      this.isHealthy = false
      throw error
    }
  }

  async analyzeSentimentBatch(request: BatchSentimentRequest): Promise<SentimentAnalysisResult[]> {
    // Split large batches to avoid API limits and improve reliability
    const maxBatchSize = 25 // Smaller batches for better reliability
    const results: SentimentAnalysisResult[] = []
    const failedMessages: Array<{ id: string; error: string }> = []

    // Process in smaller sub-batches
    for (let i = 0; i < request.messages.length; i += maxBatchSize) {
      const subBatch = request.messages.slice(i, i + maxBatchSize)
      
      try {
        const batchResults = await this.processSingleBatch(subBatch)
        results.push(...batchResults)
        
        // Add delay between sub-batches to avoid rate limiting
        if (i + maxBatchSize < request.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Add fallback neutral scores for failed sub-batch
        subBatch.forEach(msg => {
          failedMessages.push({ id: msg.id, error: errorMessage })
          results.push({
            messageId: msg.id,
            sentimentScore: 0,
            confidence: 0.1,
            reasoning: `Processing failed: ${errorMessage}`
          })
        })
      }
    }

    if (failedMessages.length > 0) {
      console.warn(`${failedMessages.length} messages processed with fallback scores:`, failedMessages)
    }

    return results
  }

  private async processSingleBatch(messages: BatchSentimentRequest['messages']): Promise<SentimentAnalysisResult[]> {
    // Check health before processing
    if (!await this.checkHealth()) {
      console.warn('Claude API is unhealthy, using fallback sentiment analysis')
      return messages.map(msg => ({
        messageId: msg.id,
        sentimentScore: 0,
        confidence: 0.1,
        reasoning: 'Claude API unavailable - using neutral sentiment'
      }))
    }

    const prompt = this.buildSentimentPrompt(messages)
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const response = await Promise.race([
          this.client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: prompt
            }],
            temperature: 0.1
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 25000) // 25 second timeout
          )
        ]) as any

        // Validate response structure
        if (!response || !response.content || !Array.isArray(response.content)) {
          throw new Error('Invalid response structure from Claude API')
        }

        const content = response.content[0]
        if (!content || content.type !== 'text' || !content.text) {
          throw new Error('Unexpected or empty response type from Claude API')
        }

        const results = this.parseSentimentResponse(content.text, messages)
        
        // Mark as healthy on success
        this.isHealthy = true
        this.lastHealthCheck = Date.now()
        
        return results
      } catch (error) {
        lastError = error as Error
        console.error(`Claude API attempt ${attempt} failed:`, error)
        
        // Mark as unhealthy on certain errors
        if (error instanceof Error && (
          error.message.includes('timeout') ||
          error.message.includes('rate limit') ||
          error.message.includes('authentication')
        )) {
          this.isHealthy = false
          this.lastHealthCheck = Date.now()
        }

        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Mark as unhealthy after all retries failed
    this.isHealthy = false
    this.lastHealthCheck = Date.now()
    
    throw new Error(`Claude API failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private buildSentimentPrompt(messages: BatchSentimentRequest['messages']): string {
    const messageList = messages.map((msg, index) => 
      `${index + 1}. [ID: ${msg.id}] ${msg.username}: "${msg.text}"`
    ).join('\n')

    return `You are a sentiment analysis expert analyzing workplace communication for employee engagement insights.

Analyze the sentiment of each message and provide scores from -1.0 (very negative) to 1.0 (very positive).

Consider these factors:
- Work-related stress indicators (deadlines, pressure, frustration)
- Team morale and collaboration tone
- Enthusiasm and engagement levels
- Burnout signals (exhaustion, cynicism, detachment)
- Positive indicators (celebration, achievement, support)

Messages to analyze:
${messageList}

Respond with ONLY a JSON array in this exact format:
[
  {
    "messageId": "message_id_1",
    "sentimentScore": 0.2,
    "confidence": 0.85
  },
  {
    "messageId": "message_id_2", 
    "sentimentScore": -0.7,
    "confidence": 0.92
  }
]

Rules:
- Scores must be between -1.0 and 1.0
- Confidence must be between 0.0 and 1.0
- Include ALL message IDs from the input
- Respond with valid JSON only, no additional text`
  }

  private parseSentimentResponse(
    response: string, 
    originalMessages: BatchSentimentRequest['messages']
  ): SentimentAnalysisResult[] {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in Claude response')
      }

      const results: Array<{
        messageId: string
        sentimentScore: number
        confidence: number
      }> = JSON.parse(jsonMatch[0])

      // Validate and sanitize results
      return results.map(result => {
        // Ensure sentiment score is within bounds
        const sanitizedScore = Math.max(-1, Math.min(1, result.sentimentScore))
        
        // Ensure confidence is within bounds
        const sanitizedConfidence = Math.max(0, Math.min(1, result.confidence || 0.5))

        return {
          messageId: result.messageId,
          sentimentScore: sanitizedScore,
          confidence: sanitizedConfidence,
          reasoning: undefined // Could be added later if needed
        }
      })
    } catch (error) {
      console.error('Failed to parse Claude response:', error)
      console.error('Raw response:', response)
      
      // Fallback: return neutral scores for all messages
      return originalMessages.map(msg => ({
        messageId: msg.id,
        sentimentScore: 0,
        confidence: 0.1, // Low confidence for fallback
        reasoning: 'Failed to parse API response'
      }))
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now()
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
      const responseTime = Date.now() - startTime
      
      this.isHealthy = true
      this.lastHealthCheck = Date.now()
      
      console.log(`Claude API health check passed in ${responseTime}ms`)
      return true
    } catch (error) {
      console.error('Claude API connection test failed:', error)
      this.isHealthy = false
      this.lastHealthCheck = Date.now()
      return false
    }
  }

  async checkHealth(): Promise<boolean> {
    const now = Date.now()
    
    // Use cached health status if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy
    }
    
    // Perform health check
    return await this.testConnection()
  }

  getHealthStatus(): { isHealthy: boolean; lastCheck: number } {
    return {
      isHealthy: this.isHealthy,
      lastCheck: this.lastHealthCheck
    }
  }
}

export const createClaudeClient = (apiKey?: string): ClaudeAPIClient => {
  return new ClaudeAPIClient(apiKey)
}