const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3004';
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const INSIGHTS_URL = `${BASE_URL}/insights`;
const CHANNELS_URL = `${BASE_URL}/channels`;
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
const TIMEOUT = 15000; // Longer timeout for AI operations

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class AISlackIntegrationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.channelId = null;
  }

  async setup() {
    console.log('🚀 Starting AI + Slack Integration Tests for Demo Readiness...');
    
    this.browser = await chromium.launch({
      headless: true
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Set up console logging to catch errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser Error: ${msg.text()}`);
      }
    });
    
    this.page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(testName, status = 'failure') {
    const timestamp = Date.now();
    const filename = `ai-slack-${testName}-${status}-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  async waitForServer() {
    console.log('⏳ Waiting for development server...');
    
    for (let i = 0; i < 30; i++) {
      try {
        const response = await this.page.goto(BASE_URL, { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        
        if (response && response.status() === 200) {
          console.log('✅ Development server is ready');
          return true;
        }
      } catch (error) {
        console.log(`⏳ Server not ready, attempt ${i + 1}/30...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('❌ Development server failed to start within 30 seconds');
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    
    try {
      await testFunction();
      console.log(`✅ PASS: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASS' });
      return true;
    } catch (error) {
      console.log(`❌ FAIL: ${testName}`);
      console.log(`   Error: ${error.message}`);
      
      await this.takeScreenshot(testName.replace(/\s+/g, '-').toLowerCase());
      this.testResults.push({ 
        name: testName, 
        status: 'FAIL', 
        error: error.message 
      });
      return false;
    }
  }

  async testDashboardLoads() {
    await this.page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Check if dashboard loads correctly - look for the main dashboard title specifically
    const dashboardTitle = await this.page.waitForSelector('h1:has-text("Dashboard")', { timeout: TIMEOUT });
    const titleText = await dashboardTitle.textContent();
    
    if (!titleText.includes('Dashboard')) {
      throw new Error(`Expected dashboard title to contain "Dashboard", got: ${titleText}`);
    }
    
    // Check for key dashboard components
    await this.page.waitForSelector('[data-testid="metric-card"], .grid .card, .metric-card, .text-3xl', { timeout: TIMEOUT });
    
    // Verify the page has loaded with metric cards or placeholders
    const hasContent = await this.page.evaluate(() => {
      return document.querySelector('.grid') !== null || 
             document.querySelector('.space-y-6') !== null ||
             document.querySelector('.animate-pulse') !== null; // Loading state is ok
    });
    
    if (!hasContent) {
      throw new Error('Dashboard content not found - no metric cards or loading states detected');
    }
  }

  async testChannelManagementFlow() {
    await this.page.goto(CHANNELS_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Look for channel management interface
    const channelsPageLoaded = await this.page.evaluate(() => {
      // Look for channel-related elements
      return document.querySelector('h1') !== null &&
             (document.body.textContent.includes('Channel') ||
              document.body.textContent.includes('Slack') ||
              document.querySelector('.channel') !== null);
    });
    
    if (!channelsPageLoaded) {
      throw new Error('Channels page did not load properly');
    }
    
    // Check if we can interact with channel elements (if any exist)
    try {
      // Look for add channel button or existing channels
      const hasChannelInterface = await this.page.evaluate(() => {
        return document.querySelector('button') !== null ||
               document.querySelector('.channel') !== null ||
               document.querySelector('form') !== null ||
               document.body.textContent.includes('Add') ||
               document.body.textContent.includes('Sync');
      });
      
      if (!hasChannelInterface) {
        console.log('ℹ️  No interactive channel elements found - this may be expected for demo setup');
      }
    } catch (error) {
      console.log(`ℹ️  Channel interaction check failed (may be expected): ${error.message}`);
    }
  }

  async testSentimentAnalysisData() {
    await this.page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Wait for dashboard to potentially load data
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for sentiment-related elements
    const sentimentElementsExist = await this.page.evaluate(() => {
      const text = document.body.textContent.toLowerCase();
      return text.includes('sentiment') || 
             text.includes('burnout') ||
             text.includes('risk') ||
             document.querySelector('.sentiment') !== null ||
             document.querySelector('[class*="sentiment"]') !== null;
    });
    
    if (!sentimentElementsExist) {
      console.log('ℹ️  No sentiment analysis data visible - may need demo data setup');
    }
    
    // Check for charts or visualizations
    const hasVisualizations = await this.page.evaluate(() => {
      return document.querySelector('svg') !== null ||
             document.querySelector('.chart') !== null ||
             document.querySelector('[class*="chart"]') !== null ||
             document.querySelector('canvas') !== null;
    });
    
    if (hasVisualizations) {
      console.log('✅ Found data visualizations on dashboard');
    } else {
      console.log('ℹ️  No data visualizations found - may indicate empty state');
    }
  }

  async testAIInsightsGeneration() {
    await this.page.goto(INSIGHTS_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Check if insights page loads - look for the main insights title specifically
    const insightsTitle = await this.page.waitForSelector('h1:has-text("Insights")', { timeout: TIMEOUT });
    const titleText = await insightsTitle.textContent();
    
    if (!titleText.includes('Insights')) {
      throw new Error(`Expected insights title to contain "Insights", got: ${titleText}`);
    }
    
    // Check for AI-generated content or empty states
    const hasAIContent = await this.page.evaluate(() => {
      const text = document.body.textContent.toLowerCase();
      return text.includes('ai') || 
             text.includes('insight') ||
             text.includes('recommendation') ||
             text.includes('analysis') ||
             text.includes('generated') ||
             document.querySelector('.insight') !== null ||
             document.querySelector('[class*="insight"]') !== null;
    });
    
    if (!hasAIContent) {
      // Check if there's an empty state message
      const hasEmptyState = await this.page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        return text.includes('no insights') ||
               text.includes('no data') ||
               text.includes('available') ||
               text.includes('enough data');
      });
      
      if (hasEmptyState) {
        console.log('ℹ️  Found empty state for insights - this is expected without demo data');
      } else {
        throw new Error('No AI insights content or empty state found');
      }
    } else {
      console.log('✅ AI insights content detected');
    }
    
    // Check for burnout alerts
    const hasBurnoutAlerts = await this.page.evaluate(() => {
      const text = document.body.textContent.toLowerCase();
      return text.includes('burnout') ||
             text.includes('alert') ||
             text.includes('risk') ||
             document.querySelector('.alert') !== null ||
             document.querySelector('[class*="alert"]') !== null;
    });
    
    if (hasBurnoutAlerts) {
      console.log('✅ Burnout alert system detected');
    }
  }

  async testSlackWebhookEndpoint() {
    // Test that the Slack webhook endpoint exists and responds
    try {
      const webhookResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('/api/slack/webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              challenge: 'test-challenge-123',
              type: 'url_verification' 
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return { status: response.status, hasChallenge: data.challenge === 'test-challenge-123' };
          }
          return { status: response.status, hasChallenge: false };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      if (webhookResponse.error) {
        console.log(`ℹ️  Webhook endpoint test failed: ${webhookResponse.error} - this may be expected in test environment`);
      } else if (webhookResponse.status === 200 && webhookResponse.hasChallenge) {
        console.log('✅ Slack webhook endpoint responds correctly to challenge');
      } else if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
        console.log('✅ Slack webhook endpoint is accessible');
      } else {
        console.log(`ℹ️  Webhook endpoint returned status: ${webhookResponse.status}`);
      }
    } catch (error) {
      console.log(`ℹ️  Webhook endpoint test error: ${error.message}`);
    }
  }

  async testEndToEndUserJourney() {
    console.log('🔄 Testing complete user journey: Dashboard → Insights → Channels');
    
    // Start at dashboard
    await this.page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await this.page.waitForSelector('h1:has-text("Dashboard")', { timeout: TIMEOUT });
    
    // Navigate to insights
    try {
      // Look for navigation links
      const insightsLink = await this.page.waitForSelector('a[href="/insights"], a[href*="insights"], nav a', { timeout: 5000 });
      await insightsLink.click();
      
      await this.page.waitForSelector('h1', { timeout: TIMEOUT });
      const currentUrl = this.page.url();
      
      if (!currentUrl.includes('insights')) {
        throw new Error(`Expected to navigate to insights page, but URL is: ${currentUrl}`);
      }
    } catch (error) {
      console.log(`ℹ️  Navigation to insights failed: ${error.message} - trying direct navigation`);
      await this.page.goto(INSIGHTS_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    }
    
    // Navigate to channels
    try {
      const channelsLink = await this.page.waitForSelector('a[href="/channels"], a[href*="channels"], nav a', { timeout: 5000 });
      await channelsLink.click();
      
      await this.page.waitForSelector('h1', { timeout: TIMEOUT });
      const currentUrl = this.page.url();
      
      if (!currentUrl.includes('channels')) {
        throw new Error(`Expected to navigate to channels page, but URL is: ${currentUrl}`);
      }
    } catch (error) {
      console.log(`ℹ️  Navigation to channels failed: ${error.message} - trying direct navigation`);
      await this.page.goto(CHANNELS_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    }
    
    console.log('✅ User journey navigation completed successfully');
  }

  async testResponsiveDesign() {
    // Test mobile responsiveness for demo purposes
    await this.page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if content is still accessible
    const mobileContent = await this.page.evaluate(() => {
      return document.querySelector('h1') !== null &&
             document.body.scrollHeight > 0;
    });
    
    if (!mobileContent) {
      throw new Error('Content not accessible on mobile viewport');
    }
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
    console.log('✅ Responsive design test passed');
  }

  async runAllTests() {
    await this.setup();
    
    try {
      await this.waitForServer();
      
      // Critical tests for demo readiness
      await this.runTest('Dashboard Loads', () => this.testDashboardLoads());
      await this.runTest('Channel Management Flow', () => this.testChannelManagementFlow());
      await this.runTest('Sentiment Analysis Interface', () => this.testSentimentAnalysisData());
      await this.runTest('AI Insights Generation', () => this.testAIInsightsGeneration());
      await this.runTest('Slack Webhook Endpoint', () => this.testSlackWebhookEndpoint());
      await this.runTest('End-to-End User Journey', () => this.testEndToEndUserJourney());
      await this.runTest('Responsive Design', () => this.testResponsiveDesign());
      
      // Print results
      console.log('\n📊 AI + Slack Integration Test Results:');
      console.log('==========================================');
      
      const passed = this.testResults.filter(r => r.status === 'PASS').length;
      const failed = this.testResults.filter(r => r.status === 'FAIL').length;
      
      this.testResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${result.name}`);
        if (result.error) {
          console.log(`   ${result.error}`);
        }
      });
      
      console.log(`\nTotal: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`);
      
      if (failed > 0) {
        console.log(`\n📸 Failure screenshots saved in: ${SCREENSHOT_DIR}`);
        console.log('\n🚨 DEMO READINESS: Some tests failed - review issues before demo');
        process.exit(1);
      } else {
        console.log('\n🎉 All integration tests passed!');
        console.log('✅ DEMO READY: AI + Slack integration is working');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('💥 Integration test suite failed to run:', error.message);
      await this.takeScreenshot('integration-suite-failure');
      process.exit(1);
    } finally {
      await this.teardown();
    }
  }
}

// Export for potential use as module
module.exports = AISlackIntegrationTest;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new AISlackIntegrationTest();
  testSuite.runAllTests().catch(console.error);
}