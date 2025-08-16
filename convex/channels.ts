import { query, mutation, action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

export const getChannels = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('channels')
      .withIndex('by_active', q => q.eq('isActive', true))
      .order('desc')
      .collect()
  }
})

export const getAllChannels = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('channels')
      .withIndex('by_created_at')
      .order('desc')
      .collect()
  }
})

export const getChannelById = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId)
  }
})

export const getChannelBySlackId = query({
  args: { slackChannelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('channels')
      .withIndex('by_slack_channel_id', q => q.eq('slackChannelId', args.slackChannelId))
      .first()
  }
})

export const addChannel = mutation({
  args: { 
    slackChannelId: v.string(), 
    channelName: v.string(),
    addedBy: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existingChannel = await ctx.db
      .query('channels')
      .withIndex('by_slack_channel_id', q => q.eq('slackChannelId', args.slackChannelId))
      .first()

    if (existingChannel) {
      throw new Error('Channel already exists')
    }

    return await ctx.db.insert('channels', {
      slackChannelId: args.slackChannelId,
      channelName: args.channelName,
      isActive: true,
      addedBy: args.addedBy || 'unknown',
      createdAt: Date.now(),
    })
  }
})

export const addChannelWithValidation = mutation({
  args: { 
    slackChannelId: v.string(), 
    channelName: v.string(),
    addedBy: v.optional(v.string()),
    validationResult: v.optional(v.object({
      valid: v.boolean(),
      channelInfo: v.optional(v.object({
        id: v.string(),
        name: v.string(),
        displayName: v.string(),
        isPrivate: v.boolean(),
        isArchived: v.boolean(),
        memberCount: v.optional(v.number()),
        purpose: v.optional(v.string()),
        topic: v.optional(v.string())
      })),
      error: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const existingChannel = await ctx.db
      .query('channels')
      .withIndex('by_slack_channel_id', q => q.eq('slackChannelId', args.slackChannelId))
      .first()

    if (existingChannel) {
      throw new Error('Channel already exists')
    }

    // Use validated channel info if available
    const channelName = args.validationResult?.channelInfo?.displayName || args.channelName

    return await ctx.db.insert('channels', {
      slackChannelId: args.slackChannelId,
      channelName,
      isActive: true,
      addedBy: args.addedBy || 'unknown',
      createdAt: Date.now(),
    })
  }
})

export const removeChannel = mutation({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId)
    if (!channel) {
      throw new Error('Channel not found')
    }

    return await ctx.db.patch(args.channelId, {
      isActive: false,
      lastSyncAt: Date.now()
    })
  }
})

export const toggleChannelActive = mutation({
  args: { 
    channelId: v.id('channels'), 
    isActive: v.boolean() 
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId)
    if (!channel) {
      throw new Error('Channel not found')
    }

    return await ctx.db.patch(args.channelId, {
      isActive: args.isActive,
      lastSyncAt: Date.now()
    })
  }
})

export const updateChannelSync = mutation({
  args: { 
    channelId: v.id('channels'), 
    lastSyncAt: v.number() 
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.channelId, {
      lastSyncAt: args.lastSyncAt
    })
  }
})

export const getChannelsWithStatus = query({
  handler: async (ctx) => {
    const channels = await ctx.db
      .query('channels')
      .withIndex('by_created_at')
      .order('desc')
      .collect()

    const channelsWithStatus = await Promise.all(
      channels.map(async (channel) => {
        const recentMessages = await ctx.db
          .query('messages')
          .withIndex('by_channel_timestamp', q => 
            q.eq('slackChannelId', channel.slackChannelId)
          )
          .order('desc')
          .take(1)

        const lastActivity = recentMessages[0]?.timestamp || channel.createdAt

        return {
          ...channel,
          lastActivity,
          status: channel.isActive ? 'active' : 'inactive'
        }
      })
    )

    return channelsWithStatus
  }
})

export const syncActiveChannels = action({
  handler: async (ctx): Promise<{ totalChannels: number; results: Array<{ channelId: string; channelName: string; success: boolean; syncId?: string; error?: string }>; timestamp: number }> => {
    const activeChannels = await ctx.runQuery(api.channels.getChannels)

    const syncResults: Array<{ channelId: string; channelName: string; success: boolean; syncId?: string; error?: string }> = []
    
    for (const channel of activeChannels) {
      try {
        // Trigger sync for each active channel
        const result: string = await ctx.scheduler.runAfter(0, api.slack.syncSlackChannel, {
          channelId: channel.slackChannelId,
          hours: 24
        })
        
        syncResults.push({
          channelId: channel.slackChannelId,
          channelName: channel.channelName,
          success: true,
          syncId: result
        })
      } catch (error) {
        console.error(`Failed to sync channel ${channel.channelName}:`, error)
        syncResults.push({
          channelId: channel.slackChannelId,
          channelName: channel.channelName,
          success: false,
          error: String(error)
        })
      }
    }

    console.log(`Triggered sync for ${activeChannels.length} active channels`)
    return {
      totalChannels: activeChannels.length,
      results: syncResults,
      timestamp: Date.now()
    }
  }
})

export const cleanupSyncProgress = mutation({
  handler: async (ctx) => {
    // This would clean up old sync progress records if we stored them in the database
    // For now, this is a placeholder for future sync progress persistence
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
    
    console.log(`Cleanup job executed at ${new Date().toISOString()}`)
    console.log(`Would clean up sync progress records older than ${new Date(cutoffTime).toISOString()}`)
    
    return {
      cleaned: 0,
      cutoffTime,
      timestamp: Date.now()
    }
  }
})