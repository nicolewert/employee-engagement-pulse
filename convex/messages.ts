import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getChannelMessages = query({
  args: { 
    slackChannelId: v.string(), 
    limit: v.optional(v.number()),
    cursor: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50
    const cursor = args.cursor || Date.now()

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_channel_timestamp', q => 
        q.eq('slackChannelId', args.slackChannelId).lt('timestamp', cursor)
      )
      .order('desc')
      .take(limit + 1)

    const hasMore = messages.length > limit
    const results = hasMore ? messages.slice(0, -1) : messages

    return {
      messages: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1].timestamp : null
    }
  }
})

export const getMessageBySlackId = query({
  args: { slackMessageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_slack_message_id', q => q.eq('slackMessageId', args.slackMessageId))
      .first()
  }
})

export const getUnprocessedMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    return await ctx.db
      .query('messages')
      .withIndex('by_sentiment_processed', q => q.eq('sentimentProcessed', false))
      .filter(q => q.eq(q.field('isDeleted'), false))
      .take(limit)
  }
})

export const getThreadMessages = query({
  args: { threadTs: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_thread', q => q.eq('threadTs', args.threadTs))
      .order('asc')
      .collect()
  }
})

export const addMessage = mutation({
  args: {
    slackMessageId: v.string(),
    slackChannelId: v.string(),
    userId: v.string(),
    username: v.string(),
    text: v.string(),
    timestamp: v.number(),
    threadTs: v.optional(v.string()),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      count: v.number(),
      users: v.array(v.string())
    })))
  },
  handler: async (ctx, args) => {
    // Check if message already exists
    const existingMessage = await ctx.db
      .query('messages')
      .withIndex('by_slack_message_id', q => q.eq('slackMessageId', args.slackMessageId))
      .first()

    if (existingMessage) {
      // Update existing message (for reactions, edits, etc.)
      return await ctx.db.patch(existingMessage._id, {
        text: args.text,
        reactions: args.reactions || [],
        username: args.username,
      })
    }

    // Find parent message if this is a thread reply
    let parentMessageId = undefined
    if (args.threadTs && args.threadTs !== args.slackMessageId) {
      const parentMessage = await ctx.db
        .query('messages')
        .withIndex('by_slack_message_id', q => q.eq('slackMessageId', args.threadTs!))
        .first()
      
      if (parentMessage) {
        parentMessageId = parentMessage._id
      }
    }

    // Insert new message
    return await ctx.db.insert('messages', {
      slackMessageId: args.slackMessageId,
      slackChannelId: args.slackChannelId,
      userId: args.userId,
      username: args.username,
      text: args.text,
      timestamp: args.timestamp,
      threadTs: args.threadTs,
      parentMessageId,
      reactions: args.reactions || [],
      sentimentScore: 0, // Placeholder - will be updated by sentiment analysis
      sentimentProcessed: false,
      isDeleted: false,
    })
  }
})

export const updateMessageSentiment = mutation({
  args: { 
    messageId: v.id('messages'), 
    sentimentScore: v.number() 
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.messageId, {
      sentimentScore: args.sentimentScore,
      sentimentProcessed: true,
      processedAt: Date.now()
    })
  }
})

export const updateMessageReactions = mutation({
  args: {
    slackMessageId: v.string(),
    reactions: v.array(v.object({
      emoji: v.string(),
      count: v.number(),
      users: v.array(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query('messages')
      .withIndex('by_slack_message_id', q => q.eq('slackMessageId', args.slackMessageId))
      .first()

    if (!message) {
      throw new Error('Message not found')
    }

    return await ctx.db.patch(message._id, {
      reactions: args.reactions
    })
  }
})

export const deleteMessage = mutation({
  args: { slackMessageId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query('messages')
      .withIndex('by_slack_message_id', q => q.eq('slackMessageId', args.slackMessageId))
      .first()

    if (!message) {
      return null // Message not found, nothing to delete
    }

    return await ctx.db.patch(message._id, {
      isDeleted: true
    })
  }
})

export const getSentimentTrends = query({
  args: { 
    channelId: v.string(), 
    days: v.number() 
  },
  handler: async (ctx, args) => {
    const startTime = Date.now() - (args.days * 24 * 60 * 60 * 1000)
    
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_channel_timestamp', q => 
        q.eq('slackChannelId', args.channelId).gte('timestamp', startTime)
      )
      .filter(q => 
        q.and(
          q.eq(q.field('sentimentProcessed'), true),
          q.eq(q.field('isDeleted'), false)
        )
      )
      .collect()

    // Group messages by day and calculate daily averages
    const dailyData = new Map<string, { scores: number[], count: number }>()
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { scores: [], count: 0 })
      }
      
      const dayData = dailyData.get(date)!
      dayData.scores.push(msg.sentimentScore)
      dayData.count++
    })

    // Convert to array format with daily averages
    const trends = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      sentiment: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      volume: data.count
    }))

    return trends.sort((a, b) => a.date.localeCompare(b.date))
  }
})