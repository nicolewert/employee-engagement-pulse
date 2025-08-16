import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { ActionCtx } from './_generated/server'
// Note: MessageValidator would be imported if used, but for demo purposes
// we'll implement inline validation to avoid import path complexity

interface SlackMessage {
  type: string
  ts: string
  user: string
  text: string
  channel: string
  thread_ts?: string
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
}

interface SlackUser {
  id: string
  name: string
  real_name?: string
  profile?: {
    email?: string
    display_name?: string
  }
  is_bot?: boolean
}

interface SlackWebhookEvent {
  type: string
  event?: {
    type: string
    channel: string
    user: string
    text?: string
    ts: string
    thread_ts?: string
    message?: SlackMessage
    previous_message?: SlackMessage
    reaction?: string
    item?: {
      type: string
      channel: string
      ts: string
    }
    item_user?: string
  }
  challenge?: string
}

// Validation helper functions for demo reliability
function isValidTimestamp(ts: string): boolean {
  try {
    const timestamp = parseFloat(ts)
    if (isNaN(timestamp) || timestamp <= 0) {
      return false
    }
    
    const now = Date.now() / 1000
    const oneYearAgo = now - (365 * 24 * 60 * 60)
    const oneHourFromNow = now + (60 * 60)
    
    return timestamp >= oneYearAgo && timestamp <= oneHourFromNow
  } catch {
    return false
  }
}

function validateEventStructure(event: unknown): boolean {
  if (!event || typeof event !== 'object') {
    return false
  }
  
  const eventObj = event as Record<string, unknown>
  return !!(eventObj.type && typeof eventObj.type === 'string')
}

export const processSlackWebhook = action({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    // Enhanced payload validation for demo reliability
    if (!args.payload || typeof args.payload !== 'object') {
      console.error('Invalid webhook payload structure')
      return { success: false, error: 'Invalid payload structure' }
    }

    const event: SlackWebhookEvent = args.payload

    // Handle URL verification challenge
    if (event.challenge) {
      console.log('Handling Slack URL verification challenge')
      return { challenge: event.challenge }
    }

    if (!event.event) {
      console.error('No event data in webhook payload')
      return { success: false, error: 'No event data' }
    }

    // Validate event structure
    if (!validateEventStructure(event.event)) {
      console.error('Invalid event structure')
      return { success: false, error: 'Invalid event structure' }
    }

    const { event: slackEvent } = event

    try {
      console.log(`Processing Slack event: ${slackEvent.type}`)
      
      switch (slackEvent.type) {
        case 'message':
          await handleMessageEvent(ctx, slackEvent)
          break
          
        case 'message.changed':
          await handleMessageChanged(ctx, slackEvent)
          break
          
        case 'message.deleted':
          await handleMessageDeleted(ctx, slackEvent)
          break
          
        case 'reaction_added':
        case 'reaction_removed':
          await handleReactionEvent(ctx, slackEvent)
          break
          
        default:
          console.log(`Unhandled event type: ${slackEvent.type}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error processing Slack webhook:', error)
      return { success: false, error: String(error) }
    }
  }
})

async function handleMessageEvent(ctx: ActionCtx, event: SlackWebhookEvent['event']) {
  if (!event || typeof event !== 'object') {
    console.error('Invalid event data in handleMessageEvent')
    return
  }

  const messageEvent = event as {
    type: string
    channel: string
    user?: string
    text?: string
    ts: string
    thread_ts?: string
    bot_id?: string
    subtype?: string
  }
  // Skip bot messages and system messages
  if (messageEvent.bot_id || messageEvent.subtype === 'bot_message' || messageEvent.user === 'USLACKBOT') {
    return
  }

  // Validate required fields
  if (!messageEvent.channel || !messageEvent.ts) {
    console.error('Missing required fields in message event')
    return
  }

  // Validate timestamp format for demo reliability
  if (!isValidTimestamp(messageEvent.ts)) {
    console.error(`Invalid timestamp in message event: ${messageEvent.ts}`)
    return
  }

  // Check if channel is being monitored
  const channel = await ctx.runQuery(api.channels.getChannelBySlackId, {
    slackChannelId: messageEvent.channel
  })

  if (!channel || !channel.isActive) {
    console.log(`Message received from unmonitored channel: ${messageEvent.channel}`)
    return
  }

  // Get or create user
  if (messageEvent.user) {
    try {
      await ctx.runMutation(api.users.upsertUser, {
        slackUserId: messageEvent.user,
        username: messageEvent.user, // Will be updated with real username later
        displayName: messageEvent.user,
        isBot: false
      })
    } catch (error) {
      console.error('Failed to upsert user:', error)
      // Continue processing even if user creation fails
    }
  }

  // Store message
  try {
    await ctx.runMutation(api.messages.addMessage, {
      slackMessageId: messageEvent.ts,
      slackChannelId: messageEvent.channel,
      userId: messageEvent.user || 'unknown',
      username: messageEvent.user || 'unknown',
      text: messageEvent.text || '',
      timestamp: Math.floor(parseFloat(messageEvent.ts) * 1000),
      threadTs: messageEvent.thread_ts,
      reactions: []
    })
    console.log(`Stored message ${messageEvent.ts} from channel ${messageEvent.channel}`)
  } catch (error) {
    console.error('Failed to store message:', error)
    throw error // Re-throw to ensure webhook processing fails if message storage fails
  }
}

async function handleMessageChanged(ctx: ActionCtx, event: SlackWebhookEvent['event']) {
  if (!event || typeof event !== 'object') {
    console.error('Invalid event data in handleMessageChanged')
    return
  }

  const changeEvent = event as {
    type: string
    channel: string
    message?: {
      ts: string
      user?: string
      text?: string
      thread_ts?: string
      subtype?: string
    }
  }
  if (!changeEvent.message || changeEvent.message.subtype === 'bot_message') {
    return
  }

  if (!changeEvent.message.ts || !changeEvent.channel) {
    console.error('Missing required fields in message changed event')
    return
  }

  try {
    const existingMessage = await ctx.runQuery(api.messages.getMessageBySlackId, {
      slackMessageId: changeEvent.message.ts
    })

    if (existingMessage) {
      await ctx.runMutation(api.messages.addMessage, {
        slackMessageId: changeEvent.message.ts,
        slackChannelId: changeEvent.channel,
        userId: changeEvent.message.user || 'unknown',
        username: changeEvent.message.user || 'unknown',
        text: changeEvent.message.text || '',
        timestamp: Math.floor(parseFloat(changeEvent.message.ts) * 1000),
        threadTs: changeEvent.message.thread_ts,
        reactions: []
      })
      console.log(`Updated message ${changeEvent.message.ts}`)
    }
  } catch (error) {
    console.error('Failed to update message:', error)
  }
}

async function handleMessageDeleted(ctx: ActionCtx, event: SlackWebhookEvent['event']) {
  if (!event || typeof event !== 'object') {
    console.error('Invalid event data in handleMessageDeleted')
    return
  }

  const deleteEvent = event as {
    type: string
    previous_message?: {
      ts: string
    }
  }
  if (deleteEvent.previous_message?.ts) {
    try {
      await ctx.runMutation(api.messages.deleteMessage, {
        slackMessageId: deleteEvent.previous_message.ts
      })
      console.log(`Deleted message ${deleteEvent.previous_message.ts}`)
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }
}

async function handleReactionEvent(ctx: ActionCtx, event: SlackWebhookEvent['event']) {
  if (!event || typeof event !== 'object') {
    console.error('Invalid event data in handleReactionEvent')
    return
  }

  const reactionEvent = event as {
    type: string
    reaction?: string
    item?: {
      type: string
      channel: string
      ts: string
    }
  }
  if (!reactionEvent.item || reactionEvent.item.type !== 'message' || !reactionEvent.reaction) {
    return
  }

  // For simplicity, we'll fetch the current reactions from Slack API later
  // This is a placeholder for reaction handling
  console.log(`Reaction ${reactionEvent.reaction} ${reactionEvent.type === 'reaction_added' ? 'added' : 'removed'} to message ${reactionEvent.item.ts}`)
}

export const syncSlackChannel = action({
  args: { 
    channelId: v.string(), 
    hours: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const { syncSlackChannelWithProgress } = await import('./lib/slackAPI')
    
    const channel = await ctx.runQuery(api.channels.getChannelBySlackId, {
      slackChannelId: args.channelId
    })

    if (!channel) {
      throw new Error('Channel not found')
    }

    // Sync with enhanced progress tracking
    const result = await syncSlackChannelWithProgress(
      ctx,
      args.channelId,
      args.hours || 24
    )

    // Update channel sync timestamp
    await ctx.runMutation(api.channels.updateChannelSync, {
      channelId: channel._id,
      lastSyncAt: Date.now()
    })

    console.log(`Synced channel ${args.channelId}: ${result.messageCount} messages`)
    
    return { 
      success: result.success, 
      channelId: args.channelId,
      syncedHours: args.hours || 24,
      messageCount: result.messageCount,
      error: result.error,
      timestamp: Date.now()
    }
  }
})

export const validateSlackChannel = action({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    const { validateSlackChannel: validate } = await import('./lib/slackAPI')
    return await validate(ctx, args.channelId)
  }
})

export const analyzeSentimentBatch = action({
  args: { messageIds: v.array(v.id('messages')) },
  handler: async (ctx, args): Promise<{
    success: boolean
    processedCount: number
    failedCount: number
    failedMessageIds: string[]
    totalTime?: number
    validationErrors?: number
    error?: string
    timestamp: number
  }> => {
    // Early return for empty batches - no need to initialize API client
    if (!args.messageIds || args.messageIds.length === 0) {
      return {
        success: true,
        processedCount: 0,
        failedCount: 0,
        failedMessageIds: [],
        error: 'No message IDs provided',
        timestamp: Date.now()
      }
    }

    // Check if API key is available before creating processor
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
      return {
        success: false,
        processedCount: 0,
        failedCount: args.messageIds.length,
        failedMessageIds: args.messageIds,
        error: 'ANTHROPIC_API_KEY not configured - please add your API key to .env.local',
        timestamp: Date.now()
      }
    }

    const { createSentimentProcessor } = await import('./lib/sentimentProcessor')
    const { createSentimentValidator } = await import('./lib/sentimentValidator')
    
    const processor = createSentimentProcessor()
    const validator = createSentimentValidator()
    
    const failedMessageIds: string[] = []
    const validMessages = []

    // Fetch messages with comprehensive error tracking
    const fetchResults = await Promise.allSettled(
      args.messageIds.map(async (messageId) => {
        // For actions, we need to use runQuery instead of ctx.db
        // We'll assume messageIds are actually message internal IDs
        try {
          // Since we can't directly get by ID in an action, we'll need to get all unprocessed and filter
          // This is not ideal but works for the demo
          const allMessages = await ctx.runQuery(api.messages.getUnprocessedMessages, { limit: 1000 })
          const message = allMessages.find(m => m._id === messageId)
          return { messageId, message }
        } catch (error) {
          return { messageId, message: null, error }
        }
      })
    )

    for (let i = 0; i < fetchResults.length; i++) {
      const result = fetchResults[i]
      const messageId = args.messageIds[i]
      
      if (result.status === 'rejected') {
        console.error(`Failed to fetch message ${messageId}:`, result.reason)
        failedMessageIds.push(messageId)
      } else if (result.value.message && 
                 !result.value.message.sentimentProcessed && 
                 !result.value.message.isDeleted &&
                 result.value.message.text?.trim().length > 0) {
        validMessages.push(result.value.message)
      } else {
        failedMessageIds.push(messageId) // Skip already processed or invalid messages
      }
    }

    if (validMessages.length === 0) {
      return {
        success: true,
        processedCount: 0,
        failedCount: args.messageIds.length,
        failedMessageIds,
        error: 'No valid messages to process',
        timestamp: Date.now()
      }
    }

    try {
      // Process messages through Claude API
      const { results, stats } = await processor.processBatch(validMessages)
      
      // Validate results with detailed tracking
      const { sanitizedResults, stats: validationStats } = validator.validateBatch(results)

      // Update messages with sentiment scores using batch approach
      const updateResults = await Promise.allSettled(
        sanitizedResults.map(result => 
          ctx.runMutation(api.messages.updateMessageSentiment, {
            messageId: result.messageId as any,
            sentimentScore: result.sentimentScore
          }).then(() => ({ messageId: result.messageId, success: true }))
           .catch(error => ({ messageId: result.messageId, success: false, error }))
        )
      )

      let processed = 0
      let failed = 0
      const updateFailures: string[] = []

      updateResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          processed++
        } else {
          failed++
          const messageId = sanitizedResults[index]?.messageId || 'unknown'
          updateFailures.push(messageId)
          if (result.status === 'rejected') {
            console.error(`Failed to update message ${messageId}:`, result.reason)
          }
        }
      })

      console.log(`Sentiment analysis complete: ${processed} processed, ${failed} failed`)
      console.log(`Processing stats:`, stats)
      console.log(`Validation stats:`, validationStats)

      if (updateFailures.length > 0) {
        console.error(`Failed to update messages: ${updateFailures.join(', ')}`)
      }

      return {
        success: failed === 0 && failedMessageIds.length === 0,
        processedCount: processed,
        failedCount: failed + failedMessageIds.length,
        failedMessageIds: [...failedMessageIds, ...updateFailures],
        totalTime: stats.totalTime,
        validationErrors: validationStats.errors.length,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Batch sentiment analysis failed:', error)
      
      // Fallback: mark all messages as processed with neutral sentiment
      const fallbackResults: PromiseSettledResult<any>[] = await Promise.allSettled(
        validMessages.map((msg: any) => 
          ctx.runMutation(api.messages.updateMessageSentiment, {
            messageId: msg._id,
            sentimentScore: 0 // Neutral fallback
          })
        )
      )

      const fallbackProcessed: number = fallbackResults.filter((r: PromiseSettledResult<any>) => r.status === 'fulfilled').length

      return {
        success: false,
        processedCount: fallbackProcessed,
        failedCount: validMessages.length - fallbackProcessed + failedMessageIds.length,
        failedMessageIds,
        error: `API processing failed: ${String(error)}. Applied neutral fallback to ${fallbackProcessed} messages.`,
        timestamp: Date.now()
      }
    }
  }
})

export const processUnanalyzedMessages = action({
  handler: async (ctx): Promise<{ success: boolean; processedCount: number; failedCount?: number; error?: string; timestamp: number }> => {
    // Check if API key is available before creating processor
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        error: 'ANTHROPIC_API_KEY not configured - please add your API key to .env.local',
        timestamp: Date.now()
      }
    }

    const { createSentimentProcessor } = await import('./lib/sentimentProcessor')
    
    try {
      const processor = createSentimentProcessor()

      // Use the processor's built-in method for handling unanalyzed messages
      const stats = await processor.processUnanalyzedMessages(
        // Get unprocessed messages
        async () => {
          const messages = await ctx.runQuery(api.messages.getUnprocessedMessages, {
            limit: 100 // Process larger batches for efficiency
          })
          return messages
        },
        // Update sentiment function
        async (messageId: string, score: number) => {
          await ctx.runMutation(api.messages.updateMessageSentiment, {
            messageId: messageId as any, // Cast for Convex ID type
            sentimentScore: score
          })
        }
      )

      console.log(`Background processing complete:`, stats)

      if (stats.errors.length > 0) {
        console.error('Processing errors:', stats.errors)
      }

      return {
        success: stats.failed === 0,
        processedCount: stats.processed,
        failedCount: stats.failed,
        error: stats.errors.length > 0 ? `${stats.errors.length} errors encountered` : undefined,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Background message processing failed:', error)
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        error: String(error),
        timestamp: Date.now()
      }
    }
  }
})