import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    // Test database connectivity
    const channels = await convex.query(api.channels.getChannels)
    const unprocessedMessages = await convex.query(api.messages.getUnprocessedMessages, { limit: 5 })
    
    return NextResponse.json({
      success: true,
      data: {
        activeChannels: channels.length,
        unprocessedMessages: unprocessedMessages.length,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Test adding a sample channel and message
    const testChannelId = await convex.mutation(api.channels.addChannel, {
      slackChannelId: 'C_TEST_' + Date.now(),
      channelName: '#test-channel',
      addedBy: 'test-user'
    })

    const testMessageId = await convex.mutation(api.messages.addMessage, {
      slackMessageId: 'T_TEST_' + Date.now(),
      slackChannelId: 'C_TEST_' + Date.now(),
      userId: 'U_TEST_USER',
      username: 'testuser',
      text: 'This is a test message for integration testing',
      timestamp: Date.now()
    })

    return NextResponse.json({
      success: true,
      data: {
        testChannelId,
        testMessageId,
        message: 'Test data created successfully'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}