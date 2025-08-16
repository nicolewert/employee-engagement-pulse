import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import crypto from 'crypto'

// Validate critical environment variables
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is required')
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Verify Slack signature (security measure)
    const slackSignature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')
    
    // Enhanced signature verification with proper error handling
    if (slackSignature && timestamp) {
      if (!process.env.SLACK_SIGNING_SECRET) {
        console.error('SLACK_SIGNING_SECRET not configured - webhook signatures cannot be verified')
        // In demo mode, log warning but continue processing
        console.warn('Demo mode: proceeding without signature verification')
      } else {
        const isValid = verifySlackSignature(rawBody, slackSignature, timestamp)
        if (!isValid) {
          console.error('Invalid Slack signature - rejecting webhook')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        console.log('Slack signature verified successfully')
      }
    } else {
      console.warn('Missing signature headers - webhook may not be from Slack')
    }

    const payload = JSON.parse(rawBody)

    // Handle URL verification challenge
    if (payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Validate payload before processing
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid webhook payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Process the webhook event with error handling
    try {
      const result = await convex.action(api.slack.processSlackWebhook, {
        payload
      })

      if (!result || !result.success) {
        const errorMsg = result?.error || 'Unknown processing error'
        console.error('Failed to process webhook:', errorMsg)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
      }

      console.log('Webhook processed successfully')
    } catch (convexError) {
      console.error('Convex action failed:', convexError)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

function verifySlackSignature(body: string, signature: string, timestamp: string): boolean {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!signingSecret) {
      console.error('SLACK_SIGNING_SECRET not found')
      return false
    }
    
    // Validate timestamp format
    const timestampNum = parseInt(timestamp)
    if (isNaN(timestampNum)) {
      console.error('Invalid timestamp format')
      return false
    }

    // Check timestamp is not older than 5 minutes (replay attack protection)
    const currentTime = Math.floor(Date.now() / 1000)
    if (Math.abs(currentTime - timestampNum) > 300) {
      console.error('Timestamp too old - possible replay attack')
      return false
    }

    // Create signature hash
    const sigBasestring = `v0:${timestamp}:${body}`
    const mySignature = 'v0=' + crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    )
    
    if (!isValid) {
      console.error('Signature mismatch')
    }
    
    return isValid
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Slack webhook endpoint is active' })
}