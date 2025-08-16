#!/usr/bin/env node

/**
 * Demo Data Loader for Sentiment Analysis Testing
 * Loads realistic employee engagement messages for demo purposes
 */

const { ConvexHttpClient } = require('convex/browser')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL

// Demo messages representing various workplace scenarios
const DEMO_MESSAGES = [
  // High positive sentiment
  { text: "Just finished the quarterly review and I'm so proud of what our team accomplished! The client feedback was incredible.", sentiment: "positive", user: "sarah_m", timestamp: -1800 },
  { text: "Love the new collaboration tools we implemented. Making my work so much more efficient and enjoyable!", sentiment: "positive", user: "mike_d", timestamp: -3600 },
  { text: "Team lunch was amazing today! Great to connect with everyone outside of work context.", sentiment: "positive", user: "emma_j", timestamp: -5400 },
  { text: "Finally solved that complex algorithm problem! Feel like I learned so much in the process.", sentiment: "positive", user: "david_k", timestamp: -7200 },
  { text: "Grateful for all the mentorship and support from the senior devs. Really helps with my growth.", sentiment: "positive", user: "lisa_p", timestamp: -9000 },
  
  // Moderate positive
  { text: "The new project is looking promising. Still some challenges but I'm optimistic.", sentiment: "positive", user: "john_r", timestamp: -10800 },
  { text: "Good progress on the API integration today. Should be ready for testing tomorrow.", sentiment: "positive", user: "anna_s", timestamp: -12600 },
  { text: "Presentation went well, got some good feedback from the stakeholders.", sentiment: "positive", user: "chris_b", timestamp: -14400 },
  
  // Neutral
  { text: "Daily standup at 10am tomorrow. Please have your updates ready.", sentiment: "neutral", user: "manager_alex", timestamp: -16200 },
  { text: "Updated the documentation for the new feature. Available in the wiki.", sentiment: "neutral", user: "tech_writer", timestamp: -18000 },
  { text: "Scheduled the code review for Thursday afternoon. Will send calendar invite.", sentiment: "neutral", user: "lead_dev", timestamp: -19800 },
  { text: "Please remember to submit your timesheets by end of day Friday.", sentiment: "neutral", user: "hr_linda", timestamp: -21600 },
  
  // Moderate negative
  { text: "Struggling a bit with the new requirements. They seem to change frequently.", sentiment: "negative", user: "frustrated_dev", timestamp: -23400 },
  { text: "The bug from last week is still causing issues in production. Working on a fix.", sentiment: "negative", user: "ops_team", timestamp: -25200 },
  { text: "Meeting ran over by 45 minutes again. Hard to get actual work done.", sentiment: "negative", user: "busy_manager", timestamp: -27000 },
  { text: "Having trouble with the deployment pipeline. Third time this week it's failed.", sentiment: "negative", user: "devops_sam", timestamp: -28800 },
  
  // High negative sentiment
  { text: "I'm completely overwhelmed with the current workload. Don't think I can keep up this pace.", sentiment: "negative", user: "stressed_employee", timestamp: -30600 },
  { text: "Been working nights and weekends for three weeks straight. I'm exhausted.", sentiment: "negative", user: "burnout_risk", timestamp: -32400 },
  { text: "Communication from leadership has been poor. Don't understand the priorities anymore.", sentiment: "negative", user: "confused_team", timestamp: -34200 },
  { text: "This project feels like it's falling apart. Nothing is going according to plan.", sentiment: "negative", user: "project_concern", timestamp: -36000 },
  
  // Mixed/complex
  { text: "The deadline is tight but the challenge is exciting. Pushing myself to deliver quality work.", sentiment: "mixed", user: "ambitious_dev", timestamp: -37800 },
  { text: "Long day debugging but finally figured out the root cause. Sometimes these puzzles are satisfying.", sentiment: "mixed", user: "problem_solver", timestamp: -39600 },
  { text: "Client meeting was stressful but we got valuable feedback for improving the product.", sentiment: "mixed", user: "client_manager", timestamp: -41400 },
  
  // Recent activity
  { text: "Good morning everyone! Ready to tackle the sprint goals for this week.", sentiment: "positive", user: "morning_person", timestamp: -300 },
  { text: "Coffee machine is broken again 😞 How am I supposed to function?", sentiment: "negative", user: "coffee_dependent", timestamp: -600 },
  { text: "Anyone else having issues with the VPN today? Can't connect to the dev server.", sentiment: "neutral", user: "tech_support", timestamp: -900 },
  { text: "Just deployed the hotfix. Monitoring closely but initial results look good.", sentiment: "positive", user: "reliable_ops", timestamp: -1200 },
  { text: "Remote work is great but I miss the energy of being in the office sometimes.", sentiment: "mixed", user: "remote_worker", timestamp: -1500 },
]

class DemoDataLoader {
  constructor() {
    this.client = new ConvexHttpClient(CONVEX_URL)
    this.channelId = null
    this.loadedMessages = 0
  }

  async loadDemoData() {
    console.log('🚀 Loading Demo Data for Sentiment Analysis')
    console.log('='.repeat(50))
    
    try {
      // Create demo channel
      await this.createDemoChannel()
      
      // Load demo messages
      await this.loadDemoMessages()
      
      // Run sentiment analysis
      await this.analyzeSentiments()
      
      console.log('\n✅ Demo data loaded successfully!')
      console.log(`   - Channel: ${this.channelId}`)
      console.log(`   - Messages: ${this.loadedMessages}`)
      console.log('\n🎯 Ready for demo!')
      
    } catch (error) {
      console.error('❌ Failed to load demo data:', error)
      process.exit(1)
    }
  }

  async createDemoChannel() {
    console.log('📋 Creating demo channel...')
    
    const channelId = `demo-channel-${Date.now()}`
    
    try {
      await this.client.mutation('channels:addChannel', {
        slackChannelId: channelId,
        channelName: 'Employee Engagement Demo',
        addedBy: 'demo_admin'
      })
      
      this.channelId = channelId
      console.log(`   ✅ Channel created: ${channelId}`)
      
    } catch (error) {
      throw new Error(`Failed to create demo channel: ${error.message}`)
    }
  }

  async loadDemoMessages() {
    console.log('💬 Loading demo messages...')
    
    const baseTime = Date.now()
    let loaded = 0
    
    for (const message of DEMO_MESSAGES) {
      try {
        const messageId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const timestamp = baseTime + (message.timestamp * 1000) // Convert to milliseconds
        
        await this.client.mutation('messages:addMessage', {
          slackMessageId: messageId,
          slackChannelId: this.channelId,
          userId: message.user,
          username: message.user,
          text: message.text,
          timestamp: timestamp,
          reactions: []
        })
        
        loaded++
        process.stdout.write(`   Loading messages: ${loaded}/${DEMO_MESSAGES.length}\\r`)
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.error(`\\n   ⚠️  Failed to load message: ${error.message}`)
      }
    }
    
    this.loadedMessages = loaded
    console.log(`\\n   ✅ Loaded ${loaded} demo messages`)
  }

  async analyzeSentiments() {
    console.log('🎭 Running sentiment analysis...')
    
    try {
      const result = await this.client.action('slack:processUnanalyzedMessages')
      
      if (result.success) {
        console.log(`   ✅ Analyzed ${result.processedCount} messages`)
        
        if (result.failedCount > 0) {
          console.log(`   ⚠️  ${result.failedCount} messages failed analysis`)
        }
        
      } else {
        console.log(`   ❌ Sentiment analysis failed: ${result.message || result.error}`)
        
        if (result.processedCount > 0) {
          console.log(`   ℹ️  However, ${result.processedCount} messages were processed successfully`)
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Sentiment analysis error: ${error.message}`)
    }
  }

  async showResults() {
    console.log('\\n📊 Demo Data Summary:')
    
    try {
      // Get sentiment trends
      const trends = await this.client.query('messages:getSentimentTrends', {
        channelId: this.channelId,
        days: 1
      })
      
      if (trends.length > 0) {
        const avgSentiment = trends.reduce((sum, day) => sum + day.sentiment, 0) / trends.length
        const totalVolume = trends.reduce((sum, day) => sum + day.volume, 0)
        
        console.log(`   - Average sentiment: ${avgSentiment.toFixed(2)}`)
        console.log(`   - Message volume: ${totalVolume}`)
        console.log(`   - Trend data points: ${trends.length}`)
      } else {
        console.log('   - No trend data available yet')
      }
      
      // Get channel messages
      const messages = await this.client.query('messages:getChannelMessages', {
        slackChannelId: this.channelId,
        limit: 5
      })
      
      console.log(`\\n📝 Sample processed messages:`)
      messages.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`   ${i + 1}. "${msg.text.substring(0, 60)}..."`)
        console.log(`      Sentiment: ${msg.sentimentScore.toFixed(2)} (processed: ${msg.sentimentProcessed})`)
      })
      
    } catch (error) {
      console.log(`   ❌ Could not fetch results: ${error.message}`)
    }
  }
}

// Show available commands
function showHelp() {
  console.log('📖 Demo Data Loader Commands:')
  console.log('')
  console.log('  node load-demo-data.js          Load all demo data')
  console.log('  node load-demo-data.js --help   Show this help')
  console.log('')
  console.log('This script will:')
  console.log('  1. Create a demo channel')
  console.log('  2. Load realistic employee messages')
  console.log('  3. Run sentiment analysis')
  console.log('  4. Display results')
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }
  
  if (!CONVEX_URL) {
    console.error('❌ NEXT_PUBLIC_CONVEX_URL not configured')
    process.exit(1)
  }
  
  const loader = new DemoDataLoader()
  loader.loadDemoData()
    .then(() => loader.showResults())
    .catch(error => {
      console.error('💥 Demo data loading failed:', error)
      process.exit(1)
    })
}

module.exports = { DemoDataLoader, DEMO_MESSAGES }