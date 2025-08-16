import { query } from './_generated/server'
import { v } from 'convex/values'

export const getWeeklyDashboard = query({
  args: { 
    weekStart: v.number(), 
    channelIds: v.optional(v.array(v.string())) 
  },
  handler: async (ctx, args) => {
    const weekEnd = args.weekStart + (7 * 24 * 60 * 60 * 1000) - 1

    let channelFilter = []
    if (args.channelIds && args.channelIds.length > 0) {
      channelFilter = args.channelIds
    } else {
      const channels = await ctx.db
        .query('channels')
        .filter(q => q.eq(q.field('isActive'), true))
        .collect()
      channelFilter = channels.map(c => c.slackChannelId)
    }

    const weeklyData = await Promise.all(
      channelFilter.map(async (channelId) => {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_channel_timestamp', q => q.eq('slackChannelId', channelId))
          .filter(q => q.and(
            q.gte(q.field('timestamp'), args.weekStart),
            q.lte(q.field('timestamp'), weekEnd),
            q.eq(q.field('isDeleted'), false),
            q.eq(q.field('sentimentProcessed'), true)
          ))
          .collect()

        if (messages.length === 0) {
          return {
            channelId,
            metrics: {
              avgSentiment: 0,
              messageCount: 0,
              activeUsers: 0,
              threadEngagement: 0,
              reactionEngagement: 0
            }
          }
        }

        const uniqueUsers = new Set(messages.map(m => m.userId))
        const threadsCount = messages.filter(m => m.threadTs && m.threadTs !== m.slackMessageId).length
        const reactionsCount = messages.reduce((sum, m) => sum + m.reactions.reduce((rSum, r) => rSum + r.count, 0), 0)
        const sentimentSum = messages.reduce((sum, m) => sum + m.sentimentScore, 0)

        return {
          channelId,
          metrics: {
            avgSentiment: sentimentSum / messages.length,
            messageCount: messages.length,
            activeUsers: uniqueUsers.size,
            threadEngagement: messages.length > 0 ? (threadsCount / messages.length) * 100 : 0,
            reactionEngagement: messages.length > 0 ? reactionsCount / messages.length : 0
          }
        }
      })
    )

    const aggregatedMetrics = weeklyData.reduce((agg, channel) => {
      const metrics = channel.metrics
      return {
        avgSentiment: (agg.avgSentiment * agg.totalChannels + metrics.avgSentiment) / (agg.totalChannels + 1),
        messageCount: agg.messageCount + metrics.messageCount,
        activeUsers: agg.activeUsers + metrics.activeUsers,
        threadEngagement: (agg.threadEngagement * agg.totalChannels + metrics.threadEngagement) / (agg.totalChannels + 1),
        reactionEngagement: (agg.reactionEngagement * agg.totalChannels + metrics.reactionEngagement) / (agg.totalChannels + 1),
        totalChannels: agg.totalChannels + 1
      }
    }, {
      avgSentiment: 0,
      messageCount: 0,
      activeUsers: 0,
      threadEngagement: 0,
      reactionEngagement: 0,
      totalChannels: 0
    })

    const burnoutRisk = aggregatedMetrics.avgSentiment < -0.3 ? 'high' : 
                      aggregatedMetrics.avgSentiment < 0.1 ? 'medium' : 'low'

    return {
      weekStart: args.weekStart,
      weekEnd,
      channels: weeklyData,
      aggregatedMetrics: {
        avgSentiment: aggregatedMetrics.avgSentiment,
        messageCount: aggregatedMetrics.messageCount,
        activeUsers: aggregatedMetrics.activeUsers,
        threadEngagement: aggregatedMetrics.threadEngagement,
        reactionEngagement: aggregatedMetrics.reactionEngagement
      },
      burnoutRisk,
      channelCount: weeklyData.length
    }
  }
})

export const getSentimentTrends = query({
  args: { 
    channelId: v.string(), 
    days: v.number() 
  },
  handler: async (ctx, args) => {
    const endTime = Date.now()
    const startTime = endTime - (args.days * 24 * 60 * 60 * 1000)

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_channel_timestamp', q => q.eq('slackChannelId', args.channelId))
      .filter(q => q.and(
        q.gte(q.field('timestamp'), startTime),
        q.lte(q.field('timestamp'), endTime),
        q.eq(q.field('isDeleted'), false),
        q.eq(q.field('sentimentProcessed'), true)
      ))
      .collect()

    const dailyData = new Map()
    
    messages.forEach(message => {
      const date = new Date(message.timestamp)
      const dayKey = date.toISOString().split('T')[0]
      
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, {
          date: dayKey,
          sentiments: [],
          messageCount: 0
        })
      }
      
      const dayData = dailyData.get(dayKey)
      dayData.sentiments.push(message.sentimentScore)
      dayData.messageCount += 1
    })

    const trendData = Array.from(dailyData.values())
      .map(day => ({
        date: day.date,
        sentiment: day.sentiments.length > 0 ? 
          day.sentiments.reduce((sum: number, s: number) => sum + s, 0) / day.sentiments.length : 0,
        volume: day.messageCount
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      channelId: args.channelId,
      timeRange: args.days,
      data: trendData,
      summary: {
        totalMessages: messages.length,
        avgSentiment: messages.length > 0 ? 
          messages.reduce((sum, m) => sum + m.sentimentScore, 0) / messages.length : 0,
        trendDirection: trendData.length > 1 ? 
          trendData[trendData.length - 1].sentiment - trendData[0].sentiment : 0
      }
    }
  }
})

export const getWeeklyInsights = query({
  args: { 
    weekStart: v.number(), 
    channelId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    let insights
    
    if (args.channelId) {
      insights = await ctx.db
        .query('weeklyInsights')
        .filter(q => q.and(
          q.eq(q.field('weekStart'), args.weekStart),
          q.eq(q.field('slackChannelId'), args.channelId!)
        ))
        .collect()
    } else {
      insights = await ctx.db
        .query('weeklyInsights')
        .filter(q => q.eq(q.field('weekStart'), args.weekStart))
        .collect()
    }

    return insights.sort((a, b) => b.generatedAt - a.generatedAt)
  }
})

export const getBurnoutAlerts = query({
  args: { 
    riskLevel: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))) 
  },
  handler: async (ctx, args) => {
    const currentWeek = getWeekStart(Date.now())
    
    let query = ctx.db.query('weeklyInsights')
    
    if (args.riskLevel) {
      query = query.filter(q => q.eq(q.field('burnoutRisk'), args.riskLevel!))
    }
    
    const insights = await query
      .filter(q => q.gte(q.field('weekStart'), currentWeek - (4 * 7 * 24 * 60 * 60 * 1000))) // Last 4 weeks
      .collect()

    const channelAlerts = new Map()
    
    insights.forEach(insight => {
      const key = insight.slackChannelId
      if (!channelAlerts.has(key) || channelAlerts.get(key).weekStart < insight.weekStart) {
        channelAlerts.set(key, insight)
      }
    })

    return Array.from(channelAlerts.values())
      .filter(insight => args.riskLevel ? insight.burnoutRisk === args.riskLevel : insight.burnoutRisk !== 'low')
      .sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1 }
        return riskOrder[b.burnoutRisk as keyof typeof riskOrder] - riskOrder[a.burnoutRisk as keyof typeof riskOrder]
      })
  }
})

function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp)
  const day = date.getUTCDay()
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setUTCDate(diff))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime()
}