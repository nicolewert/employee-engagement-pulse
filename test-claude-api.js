#!/usr/bin/env node

/**
 * Quick Claude API Connectivity Test
 * Tests just the Claude API connection without database dependencies
 */

const { Anthropic } = require('@anthropic-ai/sdk')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

console.log('🧪 Quick Claude API Test')
console.log('=' .repeat(40))

async function testClaudeAPI() {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.log('❌ ANTHROPIC_API_KEY not properly configured')
    console.log('   Please set a real API key in .env.local')
    process.exit(1)
  }

  console.log('🔑 API Key: Configured')

  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY
  })

  try {
    console.log('🌐 Testing connection...')
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ 
        role: 'user', 
        content: 'Say "test"' 
      }]
    })

    if (response.content && response.content[0] && response.content[0].type === 'text') {
      console.log('✅ Connection successful!')
      console.log(`   Response: "${response.content[0].text}"`)
      
      // Now test sentiment analysis
      console.log('\n🎭 Testing sentiment analysis...')
      
      const sentimentResponse = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Analyze sentiment of this message: "I'm really excited about the new project! This is going to be amazing!"

Respond with only JSON:
{
  "sentimentScore": 0.8,
  "confidence": 0.9
}`
        }],
        temperature: 0.1
      })
      
      if (sentimentResponse.content && sentimentResponse.content[0]) {
        console.log('✅ Sentiment analysis test successful!')
        console.log(`   Response: ${sentimentResponse.content[0].text}`)
      }
      
      console.log('\n🎯 API Test Complete - Ready for integration!')
      
    } else {
      console.log('❌ Unexpected response format')
      console.log('   Response:', response)
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message)
    
    if (error.status === 401) {
      console.log('   This looks like an authentication error.')
      console.log('   Please check your ANTHROPIC_API_KEY.')
    } else if (error.status === 429) {
      console.log('   This looks like a rate limiting error.')
      console.log('   Please wait a moment and try again.')
    } else if (error.code === 'ENOTFOUND') {
      console.log('   This looks like a network connectivity issue.')
      console.log('   Please check your internet connection.')
    }
    
    process.exit(1)
  }
}

if (require.main === module) {
  testClaudeAPI()
}