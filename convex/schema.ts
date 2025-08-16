import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  channels: defineTable({
    slackChannelId: v.string(),
    channelName: v.string(),
    isActive: v.boolean(),
    addedBy: v.string(),
    createdAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  }).index('by_slack_channel_id', ['slackChannelId'])
    .index('by_created_at', ['createdAt'])
    .index('by_active', ['isActive']),

  messages: defineTable({
    slackMessageId: v.string(),
    slackChannelId: v.string(),
    userId: v.string(),
    username: v.string(),
    text: v.string(),
    timestamp: v.number(),
    threadTs: v.optional(v.string()),
    parentMessageId: v.optional(v.id('messages')),
    reactions: v.array(v.object({
      emoji: v.string(),
      count: v.number(),
      users: v.array(v.string())
    })),
    sentimentScore: v.number(),
    sentimentProcessed: v.boolean(),
    processedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
  }).index('by_slack_message_id', ['slackMessageId'])
    .index('by_channel_timestamp', ['slackChannelId', 'timestamp'])
    .index('by_sentiment_processed', ['sentimentProcessed'])
    .index('by_thread', ['threadTs'])
    .index('by_user_timestamp', ['userId', 'timestamp']),

  users: defineTable({
    slackUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    isBot: v.boolean(),
    recentSentiment: v.object({
      avgScore: v.number(),
      messageCount: v.number(),
      lastActive: v.number()
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slack_user_id', ['slackUserId'])
    .index('by_username', ['username'])
    .index('by_last_active', ['recentSentiment.lastActive']),

  weeklyInsights: defineTable({
    weekStart: v.number(),
    weekEnd: v.number(),
    slackChannelId: v.string(),
    metrics: v.object({
      avgSentiment: v.number(),
      messageCount: v.number(),
      activeUsers: v.number(),
      threadEngagement: v.number(),
      reactionEngagement: v.number()
    }),
    burnoutRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    riskFactors: v.array(v.string()),
    actionableInsights: v.array(v.string()),
    trendAnalysis: v.object({
      sentimentChange: v.number(),
      activityChange: v.number(),
      engagementChange: v.number()
    }),
    generatedAt: v.number(),
    generatedBy: v.union(v.literal('system'), v.literal('manual')),
  }).index('by_week_channel', ['weekStart', 'slackChannelId'])
    .index('by_generated_at', ['generatedAt'])
    .index('by_burnout_risk', ['burnoutRisk']),
})