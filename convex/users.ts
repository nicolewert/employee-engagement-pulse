import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('users')
      .withIndex('by_last_active')
      .order('desc')
      .collect()
  }
})

export const getUserBySlackId = query({
  args: { slackUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_slack_user_id', q => q.eq('slackUserId', args.slackUserId))
      .first()
  }
})

export const getUserSentimentProfile = query({
  args: { 
    userId: v.string(), 
    days: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_slack_user_id', q => q.eq('slackUserId', args.userId))
      .first()

    if (!user) return null

    const daysAgo = args.days || 7
    const startTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000)

    const recentMessages = await ctx.db
      .query('messages')
      .withIndex('by_user_timestamp', q => 
        q.eq('userId', args.userId).gte('timestamp', startTime)
      )
      .filter(q => q.eq(q.field('sentimentProcessed'), true))
      .collect()

    const sentimentScores = recentMessages.map(msg => msg.sentimentScore)
    const avgSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
      : 0

    return {
      user,
      recentActivity: {
        messageCount: recentMessages.length,
        avgSentiment,
        sentimentTrend: sentimentScores.slice(-7), // Last 7 messages
        lastActive: Math.max(...recentMessages.map(msg => msg.timestamp), 0)
      }
    }
  }
})

export const upsertUser = mutation({
  args: {
    slackUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    isBot: v.boolean()
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_slack_user_id', q => q.eq('slackUserId', args.slackUserId))
      .first()

    const now = Date.now()
    const userData = {
      slackUserId: args.slackUserId,
      username: args.username,
      displayName: args.displayName,
      email: args.email,
      isBot: args.isBot,
      updatedAt: now,
    }

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, userData)
    } else {
      return await ctx.db.insert('users', {
        ...userData,
        recentSentiment: {
          avgScore: 0,
          messageCount: 0,
          lastActive: now
        },
        createdAt: now,
      })
    }
  }
})

export const updateUserSentiment = mutation({
  args: { 
    slackUserId: v.string(),
    avgScore: v.number(),
    messageCount: v.number(),
    lastActive: v.number()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_slack_user_id', q => q.eq('slackUserId', args.slackUserId))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    return await ctx.db.patch(user._id, {
      recentSentiment: {
        avgScore: args.avgScore,
        messageCount: args.messageCount,
        lastActive: args.lastActive
      },
      updatedAt: Date.now()
    })
  }
})