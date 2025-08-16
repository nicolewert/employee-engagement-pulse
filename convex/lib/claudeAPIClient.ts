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
  private client: Anthropic
  private maxRetries: number = 3
  private baseDelay: number = 1000 // 1 second

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })
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
    const prompt = this.buildSentimentPrompt(messages)
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.1
        })

        const content = response.content[0]
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude API')
        }

        return this.parseSentimentResponse(content.text, messages)
      } catch (error) {
        lastError = error as Error
        console.error(`Claude API attempt ${attempt} failed:`, error)

        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

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
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
      return true
    } catch (error) {
      console.error('Claude API connection test failed:', error)
      return false
    }
  }
}

export const createClaudeClient = (apiKey?: string): ClaudeAPIClient => {
  return new ClaudeAPIClient(apiKey)
}