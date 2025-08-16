# Employee Engagement Pulse - Hackathon Context Document

## Project Overview

Employee Engagement Pulse is a real-time sentiment analysis dashboard that monitors user-defined Slack channels to provide managers with weekly team mood insights and burnout warnings. The system processes messages, threads, and reactions through Claude API for sentiment analysis, aggregates data into actionable weekly reports, and delivers live dashboard updates via Convex real-time queries.

## Tech Stack

* **Framework**: Next.js 15 with App Router
* **Database**: Convex (real-time, TypeScript-native)  
* **Styling**: Tailwind CSS v3
* **Components**: shadcn/ui (New York style)
* **Package Manager**: pnpm
* **Build Tool**: Turbopack
* **Language**: TypeScript
* **MCP Servers**: Convex + Playwright + Vercel for Claude Code
* **External APIs**: Slack Web API, Claude API

## Database Schema

### channels.ts
```typescript
{
  _id: Id<"channels">,
  slackChannelId: string,           // Slack channel ID (e.g., "C1234567890")
  channelName: string,              // Human-readable name (e.g., "#engineering")
  isActive: boolean,                // Whether currently monitoring
  addedBy: string,                  // User who added this channel
  createdAt: number,                // Unix timestamp
  lastSyncAt?: number               // Last successful sync timestamp
}
```

### messages.ts
```typescript
{
  _id: Id<"messages">,
  slackMessageId: string,           // Unique Slack message ID
  slackChannelId: string,           // References channels.slackChannelId
  userId: string,                   // Slack user ID
  username: string,                 // Display name
  text: string,                     // Message content
  timestamp: number,                // Message timestamp
  threadTs?: string,                // Thread timestamp if reply
  parentMessageId?: Id<"messages">, // Reference to parent message
  reactions: Array<{               // Emoji reactions
    emoji: string,
    count: number,
    users: string[]
  }>,
  sentimentScore: number,          // -1 (negative) to 1 (positive)
  sentimentProcessed: boolean,     // Whether sentiment analysis completed
  processedAt?: number,            // When sentiment was analyzed
  isDeleted: boolean               // Soft delete flag
}
```

### weeklyInsights.ts
```typescript
{
  _id: Id<"weeklyInsights">,
  weekStart: number,               // Monday 00:00 UTC timestamp
  weekEnd: number,                 // Sunday 23:59 UTC timestamp
  slackChannelId: string,          // Channel this insight covers
  metrics: {
    avgSentiment: number,          // Average sentiment score
    messageCount: number,          // Total messages analyzed
    activeUsers: number,           // Unique users who posted
    threadEngagement: number,      // % of messages that got replies
    reactionEngagement: number     // Average reactions per message
  },
  burnoutRisk: "low" | "medium" | "high",
  riskFactors: string[],           // Specific burnout indicators
  actionableInsights: string[],    // Manager recommendations
  trendAnalysis: {
    sentimentChange: number,       // Change from previous week
    activityChange: number,        // Message volume change
    engagementChange: number       // Engagement level change
  },
  generatedAt: number,
  generatedBy: "system" | "manual"
}
```

### users.ts
```typescript
{
  _id: Id<"users">,
  slackUserId: string,             // Slack user ID
  username: string,                // Current username
  displayName: string,             // Display name
  email?: string,                  // Email if available
  isBot: boolean,                  // Whether user is a bot
  recentSentiment: {               // Last 7 days metrics
    avgScore: number,
    messageCount: number,
    lastActive: number
  },
  createdAt: number,
  updatedAt: number
}
```

## API Contract

### Convex Queries

```typescript
// Channel Management
export const getChannels = query({
  handler: async (ctx) => {
    // Returns all monitored channels with status
  }
});

export const getChannelMessages = query({
  args: { channelId: v.id("channels"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Returns paginated messages for a channel
  }
});

// Dashboard Data
export const getWeeklyDashboard = query({
  args: { weekStart: v.number(), channelIds: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    // Returns aggregated weekly metrics for dashboard
  }
});

export const getWeeklyInsights = query({
  args: { weekStart: v.number(), channelId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Returns AI-generated insights for the week
  }
});

export const getSentimentTrends = query({
  args: { channelId: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    // Returns daily sentiment averages for trending
  }
});

// User Analytics
export const getUserSentimentProfile = query({
  args: { userId: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Returns user's sentiment history and patterns
  }
});
```

### Convex Mutations

```typescript
// Channel Management
export const addChannel = mutation({
  args: { slackChannelId: v.string(), channelName: v.string() },
  handler: async (ctx, args) => {
    // Add new channel to monitoring
  }
});

export const removeChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    // Stop monitoring channel (soft delete)
  }
});

export const toggleChannelActive = mutation({
  args: { channelId: v.id("channels"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    // Enable/disable channel monitoring
  }
});

// Message Processing
export const addMessage = mutation({
  args: {
    slackMessageId: v.string(),
    slackChannelId: v.string(),
    userId: v.string(),
    username: v.string(),
    text: v.string(),
    timestamp: v.number(),
    threadTs: v.optional(v.string()),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      count: v.number(),
      users: v.array(v.string())
    })))
  },
  handler: async (ctx, args) => {
    // Store new message for sentiment analysis
  }
});

export const updateMessageSentiment = mutation({
  args: { messageId: v.id("messages"), sentimentScore: v.number() },
  handler: async (ctx, args) => {
    // Update message with analyzed sentiment
  }
});

export const deleteMessage = mutation({
  args: { slackMessageId: v.string() },
  handler: async (ctx, args) => {
    // Soft delete message (Slack deletion event)
  }
});

// User Management
export const upsertUser = mutation({
  args: {
    slackUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    isBot: v.boolean()
  },
  handler: async (ctx, args) => {
    // Create or update user profile
  }
});
```

### Convex Actions

```typescript
// Slack Integration
export const syncSlackChannel = action({
  args: { channelId: v.string(), hours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Fetch historical messages from Slack API
  }
});

export const processSlackWebhook = action({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    // Handle real-time Slack webhook events
  }
});

// AI Processing
export const analyzeSentimentBatch = action({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    // Send messages to Claude API for sentiment analysis
  }
});

export const generateWeeklyInsights = action({
  args: { weekStart: v.number(), channelIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    // Generate AI insights using Claude API
  }
});

// Background Jobs
export const processUnanalyzedMessages = action({
  handler: async (ctx) => {
    // Find and analyze messages without sentiment scores
  }
});

export const generateScheduledInsights = action({
  handler: async (ctx) => {
    // Weekly cron job to generate insights
  }
});
```

## Component Architecture

### Core Layout Components
```typescript
// app/layout.tsx - Root layout with providers
// app/globals.css - Tailwind configuration
// components/ui/ - shadcn/ui components (Button, Card, Chart, etc.)
```

### Shared Components

```typescript
// components/SentimentChart.tsx
interface SentimentChartProps {
  data: Array<{ date: string; sentiment: number; volume: number }>;
  timeRange: "week" | "month";
  showVolume?: boolean;
}

// components/ChannelList.tsx  
interface ChannelListProps {
  channels: Channel[];
  selectedChannels: string[];
  onToggleChannel: (channelId: string) => void;
  onAddChannel: () => void;
}

// components/InsightCard.tsx
interface InsightCardProps {
  insight: WeeklyInsight;
  showActions?: boolean;
  onDismiss?: (insightId: string) => void;
}

// components/BurnoutAlert.tsx
interface BurnoutAlertProps {
  risk: "low" | "medium" | "high";
  factors: string[];
  channelName: string;
  weekStart: number;
}

// components/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: number | string;
  trend?: number;
  format?: "number" | "percent" | "sentiment";
  subtitle?: string;
}

// components/DateRangePicker.tsx
interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  presets?: Array<{ label: string; days: number }>;
}
```

### Feature Components

```typescript
// components/dashboard/WeeklyOverview.tsx
// components/dashboard/SentimentTrendChart.tsx
// components/dashboard/ChannelComparison.tsx
// components/dashboard/UserEngagementTable.tsx

// components/channels/ChannelManager.tsx
// components/channels/AddChannelDialog.tsx
// components/channels/ChannelSyncStatus.tsx

// components/insights/InsightsList.tsx
// components/insights/InsightGenerator.tsx
// components/insights/ActionableRecommendations.tsx
```

## Routing Structure

### App Router Pages

```
app/
├── layout.tsx                    # Root layout with ConvexProvider
├── page.tsx                      # Dashboard home (redirect to /dashboard)
├── globals.css                   # Tailwind styles
├── dashboard/
│   ├── page.tsx                  # Main dashboard view
│   ├── layout.tsx               # Dashboard layout with sidebar
│   └── [weekStart]/
│       └── page.tsx             # Week-specific dashboard
├── channels/
│   ├── page.tsx                 # Channel management
│   └── [channelId]/
│       ├── page.tsx             # Channel detail view
│       └── messages/
│           └── page.tsx         # Message history browser
├── insights/
│   ├── page.tsx                 # All insights overview
│   └── [weekStart]/
│       └── page.tsx             # Week-specific insights
├── settings/
│   └── page.tsx                 # App configuration
└── api/
    ├── slack/
    │   └── webhook/
    │       └── route.ts         # Slack webhook handler
    ├── sync/
    │   └── route.ts             # Manual sync trigger
    └── health/
        └── route.ts             # Health check endpoint
```

### Navigation Flow

```typescript
// Primary Navigation
const routes = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/channels", label: "Channels", icon: Hash },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings }
];

// Dashboard Sub-navigation
const dashboardTabs = [
  { href: "/dashboard", label: "This Week" },
  { href: "/dashboard/trends", label: "Trends" },
  { href: "/dashboard/teams", label: "Team View" }
];
```

## Integration Points

### 1. Slack → Convex Pipeline
```
Slack Webhook → /api/slack/webhook → processSlackWebhook(action) 
→ addMessage(mutation) → Real-time UI update
```

### 2. Sentiment Analysis Pipeline
```
New Message → analyzeSentimentBatch(action) → Claude API 
→ updateMessageSentiment(mutation) → Dashboard refresh
```

### 3. Insights Generation Flow
```
Weekly Cron → generateScheduledInsights(action) → Claude API
→ Store insights → Push notification → Dashboard update
```

### 4. Real-time Dashboard Updates
```
Convex Query → Live subscription → React component re-render
→ Chart updates → Metric refreshes
```

### 5. Channel Management Flow
```
Add Channel → Slack API validation → addChannel(mutation)
→ syncSlackChannel(action) → Historical message import
→ Sentiment analysis → Dashboard population
```

### 6. Cross-Component State Management
```typescript
// Global state through Convex queries
const channels = useQuery(api.channels.getChannels);
const weeklyData = useQuery(api.dashboard.getWeeklyDashboard, { weekStart });

// URL state for navigation
const [selectedWeek, setSelectedWeek] = useQueryState("week");
const [selectedChannels, setSelectedChannels] = useQueryState("channels");

// Local component state for UI interactions
const [isGenerating, setIsGenerating] = useState(false);
const [selectedMetric, setSelectedMetric] = useState("sentiment");
```

### 7. Error Handling & Loading States
```typescript
// Convex integration patterns
const { data, error, isLoading } = useQuery(api.dashboard.getWeeklyData);
const addChannel = useMutation(api.channels.addChannel);

// Error boundaries for component failures
// Loading skeletons for data fetching
// Optimistic updates for mutations
```

## Environment Variables Required

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Slack API
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# Claude API
ANTHROPIC_API_KEY=your-claude-api-key

# Application
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
WEBHOOK_SECRET=your-internal-webhook-secret
```

## Key Success Metrics

1. **Real-time Performance**: New Slack messages appear in dashboard within 5 seconds
2. **Sentiment Accuracy**: Claude API responses processed and stored within 10 seconds
3. **Dashboard Load Time**: Initial dashboard load under 2 seconds
4. **Insights Quality**: Generated recommendations are specific and actionable
5. **Data Completeness**: All monitored channels sync without message loss

## Slack Integration Architecture

### Technical Overview

The Slack integration provides a comprehensive, secure, and real-time pipeline for capturing team communication insights. By leveraging Slack's Events API and Convex's real-time infrastructure, we've created a robust system for continuous sentiment monitoring.

#### Integration Components

1. **Webhook Receiver**
   - Endpoint: `/api/slack/webhook`
   - Handles real-time Slack events
   - Implements signature verification using HMAC-SHA256
   - Supports message, reaction, and channel events

2. **Event Processing Flow**
   ```
   Slack Event → Webhook Receiver → Payload Validation 
   → Message Extraction → Convex Storage 
   → Sentiment Analysis Queue
   ```

3. **Security Measures**
   - Slack signing secret verification
   - Rate limiting implementation
   - Payload schema validation
   - Secure token management

#### Message Lifecycle

1. **Ingestion**
   - Receive webhook payload
   - Validate Slack signature
   - Extract message metadata
   - Store in Convex `messages` table

2. **Sentiment Analysis**
   - Batch unprocessed messages
   - Send to Claude API for sentiment scoring
   - Update message with sentiment metrics
   - Flag high-risk communication patterns

3. **Insights Generation**
   - Weekly aggregation of channel sentiments
   - AI-powered trend and burnout risk analysis
   - Generate actionable recommendations

### Technical Innovations

1. **Real-time Processing**
   - Sub-second message ingestion
   - Live dashboard updates via Convex subscriptions
   - Minimal latency between Slack and insight generation

2. **AI-Enhanced Sentiment Analysis**
   - Context-aware sentiment scoring
   - Detect subtle emotional nuances
   - Multi-dimensional sentiment evaluation

3. **Scalable Architecture**
   - Horizontal scaling with Convex actions
   - Background job processing
   - Efficient message batching

### Performance Metrics

- **Ingestion Latency**: < 200ms
- **Sentiment Analysis**: < 500ms per batch
- **Weekly Insights Generation**: < 5 seconds
- **Message Storage Efficiency**: Compressed JSON, minimal storage overhead

### Deployment Considerations

- **Slack App Permissions Required**:
  - `channels:history`
  - `groups:history`
  - `mpim:history`
  - `reactions:read`

- **Recommended Slack App Configuration**:
  - Event subscriptions enabled
  - OAuth scopes for message and user reading
  - Separate development and production apps

### Troubleshooting & Monitoring

- Comprehensive logging for webhook events
- Error tracking for failed sentiment analyses
- Periodic health checks for Slack API connectivity

### Future Roadmap

1. Multi-workspace support
2. Advanced NLP sentiment models
3. Cross-platform communication insights
4. Machine learning-based burnout prediction