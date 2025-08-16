export interface SlackMessage {
  type: string
  ts: string
  user?: string
  text?: string
  channel: string
  thread_ts?: string
  subtype?: string
  bot_id?: string
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
}

export interface SlackWebhookEvent {
  type: string
  event?: unknown
  challenge?: string
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  data?: Record<string, unknown>
}

export class MessageValidator {
  static validateWebhookEvent(payload: unknown): SlackWebhookEvent | null {
    try {
      // Basic structure validation
      if (!payload || typeof payload !== 'object') {
        console.error('Webhook validation failed: payload is not an object')
        return null
      }

      const payloadObj = payload as Record<string, unknown>

      // URL verification challenge
      if (payloadObj.challenge && typeof payloadObj.challenge === 'string') {
        return { type: 'url_verification', challenge: payloadObj.challenge }
      }

      // Event validation
      if (!payloadObj.event || typeof payloadObj.event !== 'object') {
        console.error('Invalid webhook: missing or invalid event object')
        return null
      }

      const event = payloadObj.event as Record<string, unknown>

      // Required fields
      if (!event.type || typeof event.type !== 'string') {
        console.error('Invalid webhook: missing or invalid event type')
        return null
      }

      return {
        type: (payloadObj.type as string) || 'event_callback',
        event
      }
    } catch (error) {
      console.error('Webhook validation error:', error)
      return null
    }
  }

  static validateMessageEvent(event: unknown): ValidationResult {
    const result: ValidationResult = { isValid: false }
    
    if (!event || typeof event !== 'object') {
      result.error = 'Event is not an object'
      return result
    }
    const eventObj = event as Record<string, unknown>

    // Required fields for message events
    if (!eventObj.channel || typeof eventObj.channel !== 'string') {
      result.error = 'Missing or invalid channel field'
      return result
    }

    if (!eventObj.ts || typeof eventObj.ts !== 'string') {
      result.error = 'Missing or invalid timestamp field'
      return result
    }

    // Validate timestamp format
    if (!this.isValidTimestamp(eventObj.ts)) {
      result.error = 'Invalid timestamp format'
      return result
    }

    // Skip bot messages and system messages
    if (eventObj.bot_id || eventObj.subtype === 'bot_message') {
      result.error = 'Bot message - skipping'
      result.isValid = false
      return result
    }

    result.isValid = true
    result.data = eventObj
    return result
  }

  static validateReactionEvent(event: unknown): ValidationResult {
    const result: ValidationResult = { isValid: false }
    
    if (!event || typeof event !== 'object') {
      result.error = 'Event is not an object'
      return result
    }
    const eventObj = event as Record<string, unknown>

    // Required fields for reaction events
    if (!eventObj.reaction || typeof eventObj.reaction !== 'string') {
      result.error = 'Missing or invalid reaction field'
      return result
    }

    if (!eventObj.item || typeof eventObj.item !== 'object') {
      result.error = 'Missing or invalid item field'
      return result
    }

    const item = eventObj.item as Record<string, unknown>
    if (item.type !== 'message') {
      result.error = 'Reaction not on a message'
      return result
    }

    if (!item.ts || typeof item.ts !== 'string') {
      result.error = 'Missing message timestamp in reaction item'
      return result
    }

    result.isValid = true
    result.data = eventObj
    return result
  }

  static sanitizeMessageText(text: string): string {
    if (!text || typeof text !== 'string') {
      return ''
    }

    // Remove sensitive patterns (basic sanitization)
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[credit-card]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')
      .trim()
  }

  static extractMessageMetadata(event: unknown): {
    messageId: string
    channelId: string
    userId: string
    timestamp: number
    threadTs?: string
    text: string
  } | null {
    const validation = this.validateMessageEvent(event)
    if (!validation.isValid) {
      console.error('Cannot extract metadata from invalid message event:', validation.error)
      return null
    }

    const eventObj = event as Record<string, unknown>
    
    try {
      return {
        messageId: eventObj.ts as string,
        channelId: eventObj.channel as string,
        userId: (eventObj.user as string) || 'unknown',
        timestamp: Math.floor(parseFloat(eventObj.ts as string) * 1000),
        threadTs: eventObj.thread_ts as string | undefined,
        text: this.sanitizeMessageText((eventObj.text as string) || '')
      }
    } catch (error) {
      console.error('Error extracting message metadata:', error)
      return null
    }
  }

  static isValidTimestamp(ts: string): boolean {
    try {
      const timestamp = parseFloat(ts)
      
      // Basic format check
      if (isNaN(timestamp) || timestamp <= 0) {
        return false
      }
      
      const now = Date.now() / 1000
      const oneYearAgo = now - (365 * 24 * 60 * 60) // 1 year ago
      const oneHourFromNow = now + (60 * 60) // 1 hour in future
      
      // Timestamp should be reasonable (not too old, not too far in future)
      return timestamp >= oneYearAgo && timestamp <= oneHourFromNow
    } catch (error) {
      console.error('Timestamp validation error:', error)
      return false
    }
  }

  static extractReactionData(event: unknown): {
    messageTs: string
    channelId: string
    reaction: string
    userId: string
    action: 'added' | 'removed'
  } | null {
    const validation = this.validateReactionEvent(event)
    if (!validation.isValid) {
      console.error('Cannot extract reaction data from invalid event:', validation.error)
      return null
    }

    const eventObj = event as Record<string, unknown>
    const item = eventObj.item as Record<string, unknown>
    
    try {
      return {
        messageTs: item.ts as string,
        channelId: item.channel as string,
        reaction: eventObj.reaction as string,
        userId: (eventObj.user as string) || 'unknown',
        action: eventObj.type === 'reaction_added' ? 'added' : 'removed'
      }
    } catch (error) {
      console.error('Error extracting reaction data:', error)
      return null
    }
  }
}