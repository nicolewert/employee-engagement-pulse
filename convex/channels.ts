import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

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