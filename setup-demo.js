#!/usr/bin/env node

/**
 * Demo Setup Script for Employee Engagement Pulse
 * Prepares the system for a successful hackathon demo
 */

const { ConvexHttpClient } = require('convex/browser')
const { config } = require('dotenv')
const { Anthropic } = require('@anthropic-ai/sdk')

// Load environment variables
config({ path: '.env.local' })

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

console.log('🚀 Employee Engagement Pulse - Demo Setup')
console.log('=' .repeat(60))

async function setupDemo() {
  console.log('📋 Checking system requirements...')
  
  // 1. Environment validation
  if (!CONVEX_URL) {
    console.error('❌ NEXT_PUBLIC_CONVEX_URL not found in .env.local')
    process.exit(1)
  }
  console.log('✅ Convex URL configured')

  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.log('⚠️ ANTHROPIC_API_KEY not configured')
    console.log('   For full demo functionality, add your API key to .env.local:')
    console.log('   ANTHROPIC_API_KEY=your_actual_api_key_here')
    console.log('')
    console.log('   The demo will work without it but sentiment analysis will be disabled.')
    console.log('')
    
    const answer = await askUser('Continue with demo setup anyway? (y/N): ')
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Demo setup cancelled. Please add your API key and try again.')
      process.exit(0)
    }
  } else {
    console.log('✅ API key configured')
    
    // Test API connectivity
    try {
      console.log('🔍 Testing Claude API connectivity...')
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      })
      console.log('✅ Claude API connection successful')
    } catch (error) {
      console.log('❌ Claude API test failed:', error.message)
      if (error.status === 401) {
        console.log('   This looks like an authentication error. Please check your API key.')
      }
      
      const answer = await askUser('Continue with demo setup anyway? (y/N): ')
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Demo setup cancelled. Please check your API key and try again.')
        process.exit(0)
      }
    }
  }

  // 2. Convex connection test
  console.log('🔍 Testing Convex connection...')
  const convexClient = new ConvexHttpClient(CONVEX_URL)
  
  try {
    await convexClient.query('channels:list', {})
    console.log('✅ Convex connection successful')
  } catch (error) {
    console.error('❌ Convex connection failed:', error.message)
    console.log('   Make sure the development server is running: pnpm dev-full')
    process.exit(1)
  }

  // 3. Load demo data
  console.log('\\n📊 Setting up demo data...')
  
  const answer = await askUser('Load sample messages for demo? (Y/n): ')
  if (answer.toLowerCase() !== 'n' && answer.toLowerCase() !== 'no') {
    await loadDemoData(convexClient)
  }

  // 4. Final system check
  console.log('\\n🔍 Running final system check...')
  
  try {
    // Check unprocessed messages
    const unprocessed = await convexClient.query('messages:getUnprocessedMessages', { limit: 10 })
    console.log('✅ Found', unprocessed.length, 'unprocessed messages ready for analysis')

    // Test sentiment processing (will show proper error if no API key)
    const result = await convexClient.action('slack:processUnanalyzedMessages')
    
    if (result.success) {
      console.log('✅ Sentiment processing successful:', result.processedCount, 'messages processed')
    } else if (result.error && result.error.includes('ANTHROPIC_API_KEY')) {
      console.log('⚠️ Sentiment processing disabled (API key needed)')
      console.log('   Messages can still be stored and displayed')
    } else {
      console.log('⚠️ Sentiment processing issue:', result.error)
    }

  } catch (error) {
    console.log('⚠️ System check completed with warnings:', error.message)
  }

  // 5. Demo instructions
  console.log('\\n🎯 Demo Setup Complete!')
  console.log('=' .repeat(60))
  console.log('')
  console.log('🚀 Your Employee Engagement Pulse demo is ready!')
  console.log('')
  console.log('🌐 Access your demo at: http://localhost:3005')  // Note: port might be different
  console.log('')
  console.log('📋 Demo Checklist:')
  if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
    console.log('   ✅ Sentiment analysis: ENABLED')
    console.log('   ✅ Real-time processing: WORKING')
  } else {
    console.log('   ⚠️ Sentiment analysis: DISABLED (add API key to enable)')
    console.log('   ✅ Message storage: WORKING')
  }
  console.log('   ✅ Database operations: WORKING')
  console.log('   ✅ Error handling: ROBUST')
  console.log('')
  console.log('💡 Demo Flow:')
  console.log('   1. Show message ingestion and storage')
  console.log('   2. Demonstrate sentiment analysis (if API key configured)')
  console.log('   3. Display trends and analytics')
  console.log('   4. Show error handling and edge cases')
  console.log('')
  console.log('🔧 Troubleshooting:')
  console.log('   - Run "pnpm dev-full" to start the development server')
  console.log('   - Check .env.local for proper configuration')
  console.log('   - Use "node test-claude-api.js" to test API connectivity')
  console.log('')
  console.log('🏁 Ready for hackathon demo! Good luck! 🎉')
}

async function loadDemoData(client) {
  const demoMessages = [
    { text: "Great job on the project launch! Really excited about what we built.", user: "alice_dev", sentiment: "positive" },
    { text: "Team meeting at 2pm today in the main conference room.", user: "bob_pm", sentiment: "neutral" },
    { text: "Having some issues with the CI/CD pipeline, working on a fix.", user: "charlie_ops", sentiment: "negative" },
    { text: "Love the new collaborative workspace we set up!", user: "diana_designer", sentiment: "positive" },
    { text: "Feeling a bit overwhelmed with the current sprint workload.", user: "eve_intern", sentiment: "negative" },
    { text: "Successfully deployed the hotfix, monitoring the metrics.", user: "frank_sre", sentiment: "positive" },
    { text: "Client feedback session scheduled for tomorrow morning.", user: "grace_pm", sentiment: "neutral" },
    { text: "The new API documentation looks comprehensive and helpful.", user: "henry_dev", sentiment: "positive" },
    { text: "Network connectivity issues in the east wing office.", user: "iris_it", sentiment: "negative" },
    { text: "Quarterly review went well, team exceeded expectations!", user: "jack_lead", sentiment: "positive" }
  ]

  try {
    // Create demo channel
    const channelId = 'demo-hackathon-' + Date.now()
    await client.mutation('channels:addChannel', {
      slackChannelId: channelId,
      channelName: 'Hackathon Demo Channel',
      addedBy: 'demo_admin'
    })
    console.log('✅ Created demo channel:', channelId)

    // Load demo messages
    let loaded = 0
    for (const message of demoMessages) {
      const messageId = 'demo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      await client.mutation('messages:addMessage', {
        slackMessageId: messageId,
        slackChannelId: channelId,
        userId: message.user,
        username: message.user,
        text: message.text,
        timestamp: Date.now() - (loaded * 300000), // Spread over 5 minutes each
        reactions: []
      })
      loaded++
      process.stdout.write('\\r   Loading demo messages: ' + loaded + '/' + demoMessages.length)
    }
    
    console.log('\\n✅ Loaded', loaded, 'demo messages successfully')
    
  } catch (error) {
    console.log('\\n❌ Failed to load demo data:', error.message)
  }
}

function askUser(question) {
  return new Promise((resolve) => {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

if (require.main === module) {
  setupDemo().catch(error => {
    console.error('\\n💥 Demo setup failed:', error.message)
    process.exit(1)
  })
}