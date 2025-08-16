import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ClaudeAPIClient } from "./lib/claudeAPIClient";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

interface WeeklyMetrics {
  channelId: string;
  channelName: string;
  avgSentiment: number;
  messageCount: number;
  activeUsers: number;
  threadEngagement: number;
  reactionEngagement: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  riskFactors: string[];
}

interface InsightGenerationContext {
  weekStart: number;
  weekEnd: number;
  metrics: WeeklyMetrics[];
  previousWeekMetrics?: WeeklyMetrics[];
  overallBurnoutRisk: 'low' | 'medium' | 'high';
}

// Runtime type guards for safety
function isValidWeekStart(weekStart: any): weekStart is number {
  return typeof weekStart === 'number' && 
         weekStart > 0 && 
         weekStart < Date.now() + (365 * 24 * 60 * 60 * 1000); // Not more than 1 year in the future
}

function isValidChannelIds(channelIds: any): channelIds is string[] | undefined {
  return channelIds === undefined || 
         (Array.isArray(channelIds) && channelIds.every(id => typeof id === 'string' && id.length > 0));
}

function isValidTriggerType(triggerType: any): triggerType is 'system' | 'manual' | undefined {
  return triggerType === undefined || triggerType === 'system' || triggerType === 'manual';
}

export const generateWeeklyInsights = action({
  args: { 
    weekStart: v.number(), 
    channelIds: v.optional(v.array(v.string())),
    triggerType: v.optional(v.union(v.literal('system'), v.literal('manual')))
  },
  handler: async (ctx, args) => {
    // Input validation with runtime type guards
    if (!isValidWeekStart(args.weekStart)) {
      return {
        status: "error",
        message: "Invalid weekStart parameter - must be a valid timestamp",
        generatedAt: Date.now()
      };
    }

    if (!isValidChannelIds(args.channelIds)) {
      return {
        status: "error",
        message: "Invalid channelIds parameter - must be an array of non-empty strings",
        generatedAt: Date.now()
      };
    }

    if (!isValidTriggerType(args.triggerType)) {
      return {
        status: "error",
        message: "Invalid triggerType parameter - must be 'system' or 'manual'",
        generatedAt: Date.now()
      };
    }

    const weekEnd = args.weekStart + (7 * 24 * 60 * 60 * 1000) - 1;
    const triggerType = args.triggerType || 'system';

    try {
      // Get active channels if not specified with error handling
      let targetChannels = args.channelIds || [];
      if (targetChannels.length === 0) {
        try {
          const allChannels = await ctx.runQuery(api.channels.getChannels);
          if (!allChannels || !Array.isArray(allChannels)) {
            throw new Error('Failed to retrieve channels - invalid response');
          }
          targetChannels = allChannels
            .filter(c => c && c.slackChannelId && typeof c.slackChannelId === 'string')
            .map(c => c.slackChannelId);
          
          if (targetChannels.length === 0) {
            return {
              status: "error",
              message: "No active channels found - please add channels first",
              generatedAt: Date.now()
            };
          }
        } catch (channelError) {
          console.error('Error fetching channels:', channelError);
          return {
            status: "error",
            message: "Failed to retrieve channels - please check your database connection",
            generatedAt: Date.now()
          };
        }
      }

      // Validate target channels
      const validChannels = targetChannels.filter(id => id && typeof id === 'string' && id.length > 0);
      if (validChannels.length === 0) {
        return {
          status: "error",
          message: "No valid channel IDs provided",
          generatedAt: Date.now()
        };
      }

      // Calculate metrics for current week with timeout protection
      const currentWeekMetrics = await Promise.race([
        calculateWeeklyMetrics(ctx, args.weekStart, weekEnd, validChannels),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metrics calculation timeout')), 120000) // 2 minutes
        )
      ]) as WeeklyMetrics[];
      
      // Validate current week metrics
      if (!Array.isArray(currentWeekMetrics) || currentWeekMetrics.length === 0) {
        return {
          status: "error",
          message: "Failed to calculate current week metrics",
          generatedAt: Date.now()
        };
      }

      // Calculate metrics for previous week for trend analysis with timeout
      const previousWeekStart = args.weekStart - (7 * 24 * 60 * 60 * 1000);
      const previousWeekEnd = previousWeekStart + (7 * 24 * 60 * 60 * 1000) - 1;
      
      let previousWeekMetrics: WeeklyMetrics[] = [];
      try {
        previousWeekMetrics = await Promise.race([
          calculateWeeklyMetrics(ctx, previousWeekStart, previousWeekEnd, validChannels),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Previous week metrics timeout')), 60000) // 1 minute for previous week
          )
        ]) as WeeklyMetrics[];
      } catch (prevError) {
        console.warn('Failed to calculate previous week metrics, continuing without trend analysis:', prevError);
        // Continue without previous week data
      }

      // Generate insights using Claude API with circuit breaker
      let claudeClient: ClaudeAPIClient;
      try {
        claudeClient = new ClaudeAPIClient();
      } catch (clientError) {
        console.error('Failed to initialize Claude client:', clientError);
        // Continue with fallback insights only
        claudeClient = null as any;
      }

      const generationContext: InsightGenerationContext = {
        weekStart: args.weekStart,
        weekEnd,
        metrics: currentWeekMetrics,
        previousWeekMetrics: Array.isArray(previousWeekMetrics) ? previousWeekMetrics : undefined,
        overallBurnoutRisk: calculateOverallBurnoutRisk(currentWeekMetrics)
      };

      let aiInsights: { globalInsights: string[]; channelInsights: Map<string, string[]> };
      
      if (claudeClient) {
        try {
          aiInsights = await Promise.race([
            generateAIInsights(claudeClient, generationContext),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('AI insights generation timeout')), 45000) // 45 seconds
            )
          ]) as { globalInsights: string[]; channelInsights: Map<string, string[]> };
        } catch (aiError) {
          console.warn('AI insights generation failed, using fallback:', aiError);
          aiInsights = generateFallbackInsights(generationContext);
        }
      } else {
        aiInsights = generateFallbackInsights(generationContext);
      }

      // Validate AI insights
      if (!aiInsights || !aiInsights.globalInsights || !aiInsights.channelInsights) {
        console.warn('Invalid AI insights response, regenerating fallback');
        aiInsights = generateFallbackInsights(generationContext);
      }

      // Store insights for each channel with error handling
      const storedInsights: Id<"weeklyInsights">[] = [];
      const failedChannels: string[] = [];
      
      for (const channelMetrics of currentWeekMetrics) {
        try {
          // Validate channel metrics
          if (!channelMetrics || !channelMetrics.channelId) {
            console.warn('Skipping invalid channel metrics');
            continue;
          }

          const channelInsights = filterInsightsForChannel(aiInsights, channelMetrics.channelId);
          const trendAnalysis = calculateTrendAnalysis(
            channelMetrics, 
            previousWeekMetrics?.find(p => p?.channelId === channelMetrics.channelId)
          );

          // Validate insights before storing
          if (!channelInsights || !Array.isArray(channelInsights.actionableInsights)) {
            console.warn(`Invalid insights for channel ${channelMetrics.channelId}`);
            channelInsights.actionableInsights = ['Channel analysis completed - review metrics for insights'];
          }

          const insightId = await ctx.runMutation(api.insights.storeWeeklyInsight, {
            weekStart: args.weekStart,
            weekEnd,
            slackChannelId: channelMetrics.channelId,
            metrics: {
              avgSentiment: Number(channelMetrics.avgSentiment) || 0,
              messageCount: Number(channelMetrics.messageCount) || 0,
              activeUsers: Number(channelMetrics.activeUsers) || 0,
              threadEngagement: Number(channelMetrics.threadEngagement) || 0,
              reactionEngagement: Number(channelMetrics.reactionEngagement) || 0
            },
            burnoutRisk: calculateChannelBurnoutRisk(channelMetrics),
            riskFactors: Array.isArray(channelMetrics.riskFactors) ? channelMetrics.riskFactors : ['No risk factors identified'],
            actionableInsights: channelInsights.actionableInsights,
            trendAnalysis,
            generatedBy: triggerType
          });

          if (insightId) {
            storedInsights.push(insightId);
          }
        } catch (storeError) {
          console.error(`Failed to store insights for channel ${channelMetrics.channelId}:`, storeError);
          failedChannels.push(channelMetrics.channelId);
        }
      }

      const successMessage = storedInsights.length > 0 
        ? `Generated insights for ${storedInsights.length} channels`
        : 'Insights generation completed';
      
      const warningMessage = failedChannels.length > 0 
        ? ` (${failedChannels.length} channels failed to store)`
        : '';

      return {
        status: storedInsights.length > 0 ? "success" : "partial",
        message: successMessage + warningMessage,
        insightIds: storedInsights,
        overallRisk: generationContext.overallBurnoutRisk,
        totalChannels: currentWeekMetrics.length,
        successfulChannels: storedInsights.length,
        failedChannels: failedChannels.length,
        generatedAt: Date.now()
      };

    } catch (error) {
      console.error("Critical error generating weekly insights:", error);
      
      // Provide detailed error information for debugging
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add context for common errors
        if (error.message.includes('timeout')) {
          errorMessage += " - The operation took too long. Try with fewer channels or check system performance.";
        } else if (error.message.includes('ANTHROPIC_API_KEY')) {
          errorMessage += " - Please check your Claude API configuration.";
        } else if (error.message.includes('database')) {
          errorMessage += " - Please check your database connection and try again.";
        }
      }
      
      return {
        status: "error",
        message: errorMessage,
        generatedAt: Date.now(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
        } : undefined
      };
    }
  }
});

export const storeWeeklyInsight = mutation({
  args: {
    weekStart: v.number(),
    weekEnd: v.number(),
    slackChannelId: v.string(),
    metrics: v.object({
      avgSentiment: v.number(),
      messageCount: v.number(),
      activeUsers: v.number(),
      threadEngagement: v.number(),
      reactionEngagement: v.number()
    }),
    burnoutRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    riskFactors: v.array(v.string()),
    actionableInsights: v.array(v.string()),
    trendAnalysis: v.object({
      sentimentChange: v.number(),
      activityChange: v.number(),
      engagementChange: v.number()
    }),
    generatedBy: v.union(v.literal('system'), v.literal('manual'))
  },
  handler: async (ctx, args) => {
    // Check if insight already exists and update or create
    const existing = await ctx.db
      .query("weeklyInsights")
      .filter(q => q.and(
        q.eq(q.field("weekStart"), args.weekStart),
        q.eq(q.field("slackChannelId"), args.slackChannelId)
      ))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        generatedAt: Date.now()
      });
      return existing._id;
    } else {
      return await ctx.db.insert("weeklyInsights", {
        ...args,
        generatedAt: Date.now()
      });
    }
  }
});

// Optimized query function for date-range filtered messages
async function getMessagesInDateRange(
  ctx: any,
  channelId: string,
  weekStart: number,
  weekEnd: number
): Promise<any[]> {
  const messages: any[] = [];
  let cursor = weekEnd + 1; // Start from just after the end date
  let hasMore = true;
  const maxBatchSize = 200; // Smaller batches to avoid memory issues
  const maxTotalMessages = 2000; // Hard limit to prevent memory exhaustion
  
  try {
    while (hasMore && messages.length < maxTotalMessages) {
      const batch = await ctx.runQuery(api.messages.getChannelMessages, {
        slackChannelId: channelId,
        limit: maxBatchSize,
        cursor
      });

      if (!batch || !batch.messages) {
        break;
      }

      // Filter messages within our date range
      const filteredMessages = batch.messages.filter((m: any) => {
        return m && 
               m.timestamp >= weekStart && 
               m.timestamp <= weekEnd && 
               m.sentimentProcessed && 
               !m.isDeleted &&
               typeof m.sentimentScore === 'number';
      });

      messages.push(...filteredMessages);
      
      // Check if we should continue
      hasMore = batch.hasMore && batch.nextCursor && batch.nextCursor >= weekStart;
      cursor = batch.nextCursor;
      
      // Stop if we've gone beyond our date range
      if (batch.messages.length > 0 && 
          batch.messages[batch.messages.length - 1].timestamp < weekStart) {
        break;
      }
    }
  } catch (error) {
    console.error(`Error fetching messages for channel ${channelId}:`, error);
    // Return empty array on error to prevent complete failure
    return [];
  }

  return messages;
}

// Helper functions for risk calculation algorithms with enhanced error handling
async function calculateWeeklyMetrics(
  ctx: any, 
  weekStart: number, 
  weekEnd: number, 
  channelIds: string[]
): Promise<WeeklyMetrics[]> {
  // Process channels in smaller batches to avoid memory issues and timeouts
  const batchSize = 5;
  const results: WeeklyMetrics[] = [];
  
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    
    try {
      const batchResults = await Promise.allSettled(
        batch.map(async (channelId: string) => {
          try {
            // Get channel info with error handling
            let channel;
            let channelName = channelId;
            
            try {
              channel = await ctx.runQuery(api.channels.getChannelBySlackId, { slackChannelId: channelId });
              channelName = channel?.channelName || channelId;
            } catch (error) {
              console.warn(`Failed to get channel info for ${channelId}:`, error);
              // Continue with channelId as name
            }

            // Get messages with optimized pagination
            const messages = await getMessagesInDateRange(ctx, channelId, weekStart, weekEnd);

            if (!messages || messages.length === 0) {
              return {
                channelId,
                channelName,
                avgSentiment: 0,
                messageCount: 0,
                activeUsers: 0,
                threadEngagement: 0,
                reactionEngagement: 0,
                sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
                riskFactors: ["No message activity this week"]
              };
            }

            // Calculate metrics with null safety
            const validMessages = messages.filter(m => m && typeof m.sentimentScore === 'number');
            
            if (validMessages.length === 0) {
              return {
                channelId,
                channelName,
                avgSentiment: 0,
                messageCount: 0,
                activeUsers: 0,
                threadEngagement: 0,
                reactionEngagement: 0,
                sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
                riskFactors: ["No valid messages with sentiment scores"]
              };
            }

            // Safe metric calculations
            const uniqueUsers = new Set(
              validMessages
                .map(m => m.userId)
                .filter(userId => userId && typeof userId === 'string')
            ).size;
            
            const threadsCount = validMessages.filter(m => 
              m.threadTs && 
              m.threadTs !== m.slackMessageId && 
              typeof m.threadTs === 'string'
            ).length;
            
            const reactionsCount = validMessages.reduce((sum, m) => {
              if (!m.reactions || !Array.isArray(m.reactions)) return sum;
              return sum + m.reactions.reduce((rSum: number, r: any) => {
                return rSum + (typeof r.count === 'number' ? r.count : 0);
              }, 0);
            }, 0);
            
            const sentimentSum = validMessages.reduce((sum, m) => {
              return sum + (typeof m.sentimentScore === 'number' ? m.sentimentScore : 0);
            }, 0);
            
            const avgSentiment = validMessages.length > 0 ? sentimentSum / validMessages.length : 0;

            // Calculate sentiment distribution with safety checks
            const sentimentDistribution = validMessages.reduce((dist, m: any) => {
              const score = typeof m.sentimentScore === 'number' ? m.sentimentScore : 0;
              if (score > 0.1) dist.positive++;
              else if (score < -0.1) dist.negative++;
              else dist.neutral++;
              return dist;
            }, { positive: 0, neutral: 0, negative: 0 });

            // Calculate engagement metrics safely
            const threadEngagement = validMessages.length > 0 ? (threadsCount / validMessages.length) * 100 : 0;
            const reactionEngagement = validMessages.length > 0 ? reactionsCount / validMessages.length : 0;

            // Calculate risk factors
            const riskFactors = calculateRiskFactors({
              avgSentiment,
              messageCount: validMessages.length,
              sentimentDistribution,
              threadEngagement,
              reactionEngagement
            });

            return {
              channelId,
              channelName,
              avgSentiment: Number(avgSentiment.toFixed(3)),
              messageCount: validMessages.length,
              activeUsers: uniqueUsers,
              threadEngagement: Number(threadEngagement.toFixed(1)),
              reactionEngagement: Number(reactionEngagement.toFixed(2)),
              sentimentDistribution,
              riskFactors
            };
          } catch (channelError) {
            console.error(`Error processing channel ${channelId}:`, channelError);
            // Return error state instead of failing completely
            return {
              channelId,
              channelName: channelId,
              avgSentiment: 0,
              messageCount: 0,
              activeUsers: 0,
              threadEngagement: 0,
              reactionEngagement: 0,
              sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
              riskFactors: ["Error processing channel data - please try again"]
            };
          }
        })
      );
      
      // Collect successful results and log failures
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to process channel ${batch[index]}:`, result.reason);
          // Add error placeholder
          results.push({
            channelId: batch[index],
            channelName: batch[index],
            avgSentiment: 0,
            messageCount: 0,
            activeUsers: 0,
            threadEngagement: 0,
            reactionEngagement: 0,
            sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
            riskFactors: ["Failed to process channel data"]
          });
        }
      });
      
      // Add small delay between batches to prevent overwhelming the system
      if (i + batchSize < channelIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (batchError) {
      console.error(`Error processing batch starting at index ${i}:`, batchError);
      // Add error placeholders for the entire batch
      batch.forEach(channelId => {
        results.push({
          channelId,
          channelName: channelId,
          avgSentiment: 0,
          messageCount: 0,
          activeUsers: 0,
          threadEngagement: 0,
          reactionEngagement: 0,
          sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
          riskFactors: ["Batch processing error - please try again"]
        });
      });
    }
  }

  return results;
}

function calculateRiskFactors(metrics: {
  avgSentiment: number;
  messageCount: number;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  threadEngagement: number;
  reactionEngagement: number;
}): string[] {
  const risks: string[] = [];

  if (metrics.avgSentiment < -0.3) {
    risks.push("High negative sentiment detected");
  } else if (metrics.avgSentiment < -0.1) {
    risks.push("Mild negative sentiment trend");
  }

  if (metrics.sentimentDistribution.negative > metrics.sentimentDistribution.positive * 1.5) {
    risks.push("Negative messages significantly outweigh positive");
  }

  if (metrics.threadEngagement < 15 && metrics.messageCount > 20) {
    risks.push("Low thread engagement suggests reduced collaboration");
  }

  if (metrics.reactionEngagement < 0.3 && metrics.messageCount > 20) {
    risks.push("Low reaction engagement indicates decreased team interaction");
  }

  if (metrics.messageCount < 5) {
    risks.push("Very low communication volume");
  }

  return risks;
}

function calculateChannelBurnoutRisk(metrics: WeeklyMetrics | null | undefined): 'low' | 'medium' | 'high' {
  // Input validation
  if (!metrics) {
    console.warn('calculateChannelBurnoutRisk called with null/undefined metrics');
    return 'low';
  }

  let riskScore = 0;

  // Sentiment-based risk with null safety
  const avgSentiment = typeof metrics.avgSentiment === 'number' ? metrics.avgSentiment : 0;
  if (avgSentiment < -0.4) riskScore += 3;
  else if (avgSentiment < -0.2) riskScore += 2;
  else if (avgSentiment < 0) riskScore += 1;

  // Engagement-based risk with null safety
  const threadEngagement = typeof metrics.threadEngagement === 'number' ? metrics.threadEngagement : 0;
  const reactionEngagement = typeof metrics.reactionEngagement === 'number' ? metrics.reactionEngagement : 0;
  
  if (threadEngagement < 10) riskScore += 2;
  if (reactionEngagement < 0.2) riskScore += 1;

  // Activity-based risk with null safety
  const messageCount = typeof metrics.messageCount === 'number' ? metrics.messageCount : 0;
  if (messageCount < 5) riskScore += 1;
  else if (messageCount > 200) riskScore += 1; // Too much activity can also indicate stress

  // Sentiment distribution risk with comprehensive null safety
  if (metrics.sentimentDistribution && 
      typeof metrics.sentimentDistribution === 'object' &&
      typeof metrics.sentimentDistribution.positive === 'number' &&
      typeof metrics.sentimentDistribution.neutral === 'number' &&
      typeof metrics.sentimentDistribution.negative === 'number') {
    
    const totalSentiments = metrics.sentimentDistribution.positive + 
                           metrics.sentimentDistribution.neutral + 
                           metrics.sentimentDistribution.negative;
    
    if (totalSentiments > 0) {
      const negativeRatio = metrics.sentimentDistribution.negative / totalSentiments;
      if (negativeRatio > 0.6) riskScore += 2;
      else if (negativeRatio > 0.4) riskScore += 1;
    }
  }

  // Ensure risk score is within expected bounds
  riskScore = Math.max(0, Math.min(10, riskScore));

  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

function calculateOverallBurnoutRisk(metrics: WeeklyMetrics[] | null | undefined): 'low' | 'medium' | 'high' {
  // Input validation
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    console.warn('calculateOverallBurnoutRisk called with invalid metrics array');
    return 'low';
  }

  // Filter out invalid metrics
  const validMetrics = metrics.filter(m => m && typeof m === 'object');
  if (validMetrics.length === 0) {
    console.warn('No valid metrics found for overall risk calculation');
    return 'low';
  }

  const riskCounts = validMetrics.reduce((counts, m) => {
    try {
      const risk = calculateChannelBurnoutRisk(m);
      if (risk === 'high' || risk === 'medium' || risk === 'low') {
        counts[risk]++;
      }
    } catch (error) {
      console.warn('Error calculating channel burnout risk:', error);
      counts.low++; // Default to low risk on error
    }
    return counts;
  }, { low: 0, medium: 0, high: 0 });

  const totalChannels = validMetrics.length;
  
  // Prevent division by zero
  if (totalChannels === 0) {
    return 'low';
  }

  const highRiskRatio = riskCounts.high / totalChannels;
  const mediumRiskRatio = riskCounts.medium / totalChannels;

  // Ensure ratios are valid numbers
  const safeHighRatio = isNaN(highRiskRatio) ? 0 : highRiskRatio;
  const safeMediumRatio = isNaN(mediumRiskRatio) ? 0 : mediumRiskRatio;

  if (safeHighRatio > 0.3 || (safeHighRatio > 0.1 && safeMediumRatio > 0.4)) {
    return 'high';
  }
  
  if (safeMediumRatio > 0.5 || safeHighRatio > 0.1) {
    return 'medium';
  }

  return 'low';
}

function calculateTrendAnalysis(
  currentMetrics: WeeklyMetrics | null | undefined,
  previousMetrics?: WeeklyMetrics | null | undefined
): { sentimentChange: number; activityChange: number; engagementChange: number } {
  // Input validation
  if (!currentMetrics || !previousMetrics) {
    return { sentimentChange: 0, activityChange: 0, engagementChange: 0 };
  }

  try {
    // Safe extraction of numeric values with defaults
    const currentSentiment = typeof currentMetrics.avgSentiment === 'number' ? currentMetrics.avgSentiment : 0;
    const previousSentiment = typeof previousMetrics.avgSentiment === 'number' ? previousMetrics.avgSentiment : 0;
    const currentMessageCount = typeof currentMetrics.messageCount === 'number' ? currentMetrics.messageCount : 0;
    const previousMessageCount = typeof previousMetrics.messageCount === 'number' ? previousMetrics.messageCount : 0;
    const currentThreadEngagement = typeof currentMetrics.threadEngagement === 'number' ? currentMetrics.threadEngagement : 0;
    const previousThreadEngagement = typeof previousMetrics.threadEngagement === 'number' ? previousMetrics.threadEngagement : 0;

    // Calculate changes with safety checks
    const sentimentChange = currentSentiment - previousSentiment;
    
    const activityChange = previousMessageCount > 0 
      ? ((currentMessageCount - previousMessageCount) / previousMessageCount) * 100
      : currentMessageCount > 0 ? 100 : 0; // If no previous messages but current has some, it's 100% increase
    
    const engagementChange = previousThreadEngagement > 0
      ? ((currentThreadEngagement - previousThreadEngagement) / previousThreadEngagement) * 100
      : currentThreadEngagement > 0 ? 100 : 0; // If no previous engagement but current has some, it's 100% increase

    // Validate calculated values and apply reasonable bounds
    const safeSentimentChange = isNaN(sentimentChange) ? 0 : Math.max(-2, Math.min(2, sentimentChange));
    const safeActivityChange = isNaN(activityChange) ? 0 : Math.max(-100, Math.min(1000, activityChange));
    const safeEngagementChange = isNaN(engagementChange) ? 0 : Math.max(-100, Math.min(1000, engagementChange));

    return {
      sentimentChange: Number(safeSentimentChange.toFixed(3)),
      activityChange: Number(safeActivityChange.toFixed(1)),
      engagementChange: Number(safeEngagementChange.toFixed(1))
    };
  } catch (error) {
    console.error('Error calculating trend analysis:', error);
    return { sentimentChange: 0, activityChange: 0, engagementChange: 0 };
  }
}

// Circuit breaker state for Claude API
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

let circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed'
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
const AI_REQUEST_TIMEOUT = 30000; // 30 seconds

// AI Insights Generation with Circuit Breaker and Robust Error Handling
async function generateAIInsights(
  claudeClient: ClaudeAPIClient,
  context: InsightGenerationContext
): Promise<{ globalInsights: string[]; channelInsights: Map<string, string[]> }> {
  // Check circuit breaker state
  if (circuitBreaker.state === 'open') {
    const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
    if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn('Circuit breaker is open, using fallback insights');
      return generateFallbackInsights(context);
    } else {
      circuitBreaker.state = 'half-open';
    }
  }

  const prompt = buildInsightsPrompt(context);
  let result: { globalInsights: string[]; channelInsights: Map<string, string[]> };

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Claude API request timeout')), AI_REQUEST_TIMEOUT);
    });

    // Create API request promise
    const apiPromise = claudeClient.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    // Race between timeout and API call
    const response = await Promise.race([apiPromise, timeoutPromise]) as any;

    // Validate response structure
    if (!response || !response.content || !Array.isArray(response.content)) {
      throw new Error('Invalid response structure from Claude API');
    }

    const content = response.content[0];
    if (!content || content.type !== 'text' || !content.text) {
      throw new Error('Unexpected or empty response type from Claude API');
    }

    // Validate content length
    if (content.text.length < 50) {
      throw new Error('Response too short, likely truncated or invalid');
    }

    result = parseInsightsResponse(content.text, context.metrics.map(m => m.channelId));
    
    // Validate parsed results
    if (!result.globalInsights || !Array.isArray(result.globalInsights) || 
        !result.channelInsights || !(result.channelInsights instanceof Map)) {
      throw new Error('Failed to parse valid insights from API response');
    }

    // Success - reset circuit breaker
    if (circuitBreaker.state === 'half-open') {
      circuitBreaker.state = 'closed';
      circuitBreaker.failures = 0;
    }

    return result;
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    
    // Update circuit breaker state
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.state = 'open';
      console.warn(`Circuit breaker opened after ${circuitBreaker.failures} failures`);
    }
    
    return generateFallbackInsights(context);
  }
}

function buildInsightsPrompt(context: InsightGenerationContext): string {
  const metricsAnalysis = context.metrics.map(m => {
    const trend = context.previousWeekMetrics?.find(p => p.channelId === m.channelId);
    const sentimentTrend = trend ? 
      (m.avgSentiment - trend.avgSentiment > 0.1 ? "improving" : 
       m.avgSentiment - trend.avgSentiment < -0.1 ? "declining" : "stable") : "new";

    return `Channel ${m.channelName}:
- Sentiment: ${m.avgSentiment.toFixed(2)} (${sentimentTrend})
- Activity: ${m.messageCount} messages, ${m.activeUsers} active users
- Engagement: ${m.threadEngagement.toFixed(1)}% threads, ${m.reactionEngagement.toFixed(2)} reactions/msg
- Risk Factors: ${m.riskFactors.join(', ') || 'None identified'}`;
  }).join('\n\n');

  return `You are an expert workplace psychologist analyzing team communication patterns for employee engagement insights.

Analyze this weekly team communication data and provide specific, actionable insights for managers:

Overall Risk Level: ${context.overallBurnoutRisk.toUpperCase()}
Date Range: ${new Date(context.weekStart).toLocaleDateString()} - ${new Date(context.weekEnd).toLocaleDateString()}

${metricsAnalysis}

Provide insights in this JSON format:
{
  "globalInsights": [
    "Insight about overall team health and trends",
    "Another cross-team observation"
  ],
  "channelInsights": {
    "channel_id_1": [
      "Specific actionable recommendation for this channel",
      "Another insight for this channel"
    ],
    "channel_id_2": [
      "Channel-specific insight"
    ]
  }
}

Focus on:
1. Actionable recommendations managers can implement
2. Early warning signs of burnout or disengagement
3. Positive trends to reinforce
4. Specific team dynamics insights
5. Communication pattern improvements

Keep insights concise, specific, and immediately actionable. Avoid generic advice.`;
}

function parseInsightsResponse(
  response: string, 
  channelIds: string[]
): { globalInsights: string[]; channelInsights: Map<string, string[]> } {
  try {
    // Multiple JSON extraction strategies for robustness
    let jsonStr = '';
    
    // Strategy 1: Look for JSON block in code blocks
    const codeBlockMatch = response.match(/```(?:json)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // Strategy 2: Look for JSON object
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('No JSON structure found in response');
      }
    }

    // Clean up common formatting issues
    jsonStr = jsonStr
      .replace(/^[\s\S]*?(\{)/, '$1') // Remove content before first {
      .replace(/(\})[\s\S]*$/, '$1') // Remove content after last }
      .replace(/\n\s*\/\/.*$/gm, '') // Remove line comments
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

    if (!jsonStr || jsonStr.length < 10) {
      throw new Error('Extracted JSON is too short or empty');
    }

    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed response is not a valid object');
    }

    const channelInsights = new Map<string, string[]>();

    // Robust channel insights processing
    if (parsed.channelInsights && typeof parsed.channelInsights === 'object') {
      Object.entries(parsed.channelInsights).forEach(([channelId, insights]) => {
        if (Array.isArray(insights) && insights.length > 0) {
          // Filter out empty or invalid insights
          const validInsights = insights
            .filter(insight => typeof insight === 'string' && insight.trim().length > 10)
            .slice(0, 5); // Limit to 5 insights per channel
          
          if (validInsights.length > 0) {
            channelInsights.set(channelId, validInsights);
          }
        }
      });
    }

    // Validate and clean global insights
    let globalInsights: string[] = [];
    if (Array.isArray(parsed.globalInsights)) {
      globalInsights = parsed.globalInsights
        .filter((insight: any) => typeof insight === 'string' && insight.trim().length > 10)
        .slice(0, 3); // Limit to 3 global insights
    }

    // Ensure we have some insights
    if (globalInsights.length === 0 && channelInsights.size === 0) {
      throw new Error('No valid insights extracted from response');
    }

    return {
      globalInsights,
      channelInsights
    };
  } catch (error) {
    console.error('Failed to parse insights response:', error);
    console.error('Raw response:', response?.substring(0, 500) + '...');
    
    // Return structured error fallback
    return {
      globalInsights: [
        "AI insights temporarily unavailable - analysis based on metrics shown below",
        "Manual review of team communication patterns recommended"
      ],
      channelInsights: new Map()
    };
  }
}

function generateFallbackInsights(context: InsightGenerationContext): { globalInsights: string[]; channelInsights: Map<string, string[]> } {
  const globalInsights: string[] = [];
  const channelInsights = new Map<string, string[]>();

  // Ensure we have valid metrics to work with
  if (!context.metrics || context.metrics.length === 0) {
    return {
      globalInsights: [
        "No channel data available for this week",
        "Please check channel synchronization and try again"
      ],
      channelInsights: new Map()
    };
  }

  // Generate comprehensive algorithmic insights based on metrics
  const highRiskChannels = context.metrics.filter(m => calculateChannelBurnoutRisk(m) === 'high');
  const mediumRiskChannels = context.metrics.filter(m => calculateChannelBurnoutRisk(m) === 'medium');
  const lowEngagementChannels = context.metrics.filter(m => m.threadEngagement < 15 && m.messageCount > 5);
  const inactiveChannels = context.metrics.filter(m => m.messageCount < 5);
  const negativeSentimentChannels = context.metrics.filter(m => m.avgSentiment < -0.1);

  // Global insights with actionable recommendations
  if (highRiskChannels.length > 0) {
    globalInsights.push(`🚨 URGENT: ${highRiskChannels.length} channel(s) showing high burnout risk - immediate manager intervention needed`);
  }
  
  if (mediumRiskChannels.length > 0) {
    globalInsights.push(`⚠️ ${mediumRiskChannels.length} channel(s) have medium burnout risk - schedule check-ins this week`);
  }

  if (lowEngagementChannels.length > 0) {
    globalInsights.push(`📉 ${lowEngagementChannels.length} channel(s) show low engagement - consider team building or process improvements`);
  }

  if (negativeSentimentChannels.length > 0) {
    globalInsights.push(`😟 ${negativeSentimentChannels.length} channel(s) have negative sentiment trends - investigate potential issues`);
  }

  if (inactiveChannels.length > 0) {
    globalInsights.push(`💤 ${inactiveChannels.length} channel(s) were very quiet this week - verify team availability and workload`);
  }

  // Add positive insights if things are going well
  const healthyChannels = context.metrics.filter(m => 
    calculateChannelBurnoutRisk(m) === 'low' && 
    m.avgSentiment > 0.1 && 
    m.threadEngagement > 20
  );
  
  if (healthyChannels.length > 0) {
    globalInsights.push(`✅ ${healthyChannels.length} channel(s) showing healthy engagement and positive sentiment`);
  }

  // Ensure we have at least one global insight
  if (globalInsights.length === 0) {
    globalInsights.push("📊 Team metrics analysis complete - review individual channel insights below");
  }

  // Generate detailed channel-specific fallback insights
  context.metrics.forEach((m: WeeklyMetrics) => {
    const insights: string[] = [];
    const risk = calculateChannelBurnoutRisk(m);
    
    // Risk-based insights
    if (risk === 'high') {
      insights.push(`🚨 HIGH RISK: Immediate attention required - multiple burnout indicators detected`);
      if (m.avgSentiment < -0.3) {
        insights.push(`💬 Very negative sentiment (${m.avgSentiment.toFixed(2)}) - schedule urgent team discussion`);
      }
    } else if (risk === 'medium') {
      insights.push(`⚠️ MEDIUM RISK: Monitor closely and consider preventive actions`);
    }
    
    // Sentiment-specific insights
    if (m.avgSentiment < -0.2) {
      insights.push(`📉 Declining sentiment detected - conduct 1:1 meetings to identify concerns`);
    } else if (m.avgSentiment > 0.2) {
      insights.push(`😊 Positive team sentiment - reinforce what's working well`);
    }
    
    // Engagement insights
    if (m.threadEngagement < 10 && m.messageCount > 10) {
      insights.push(`🔗 Very low thread engagement (${m.threadEngagement.toFixed(1)}%) - encourage collaborative discussions`);
    } else if (m.threadEngagement > 30) {
      insights.push(`🎯 High thread engagement (${m.threadEngagement.toFixed(1)}%) - team is actively collaborating`);
    }
    
    // Activity level insights
    if (m.messageCount < 5) {
      insights.push(`💤 Very quiet week (${m.messageCount} messages) - check team availability and workload`);
    } else if (m.messageCount > 100) {
      insights.push(`📈 High activity week (${m.messageCount} messages) - monitor for potential overload`);
    }
    
    // User engagement insights
    if (m.activeUsers < 3 && m.messageCount > 10) {
      insights.push(`👥 Low user diversity (${m.activeUsers} active users) - encourage broader team participation`);
    }
    
    // Reaction engagement insights
    if (m.reactionEngagement < 0.2 && m.messageCount > 10) {
      insights.push(`👍 Low reaction engagement - team may be disengaged or rushed`);
    }

    // Trend analysis if available
    const previousMetrics = context.previousWeekMetrics?.find(p => p.channelId === m.channelId);
    if (previousMetrics) {
      const sentimentChange = m.avgSentiment - previousMetrics.avgSentiment;
      if (Math.abs(sentimentChange) > 0.2) {
        const direction = sentimentChange > 0 ? 'improved' : 'declined';
        insights.push(`📊 Sentiment has ${direction} significantly from last week (${sentimentChange > 0 ? '+' : ''}${sentimentChange.toFixed(2)})`);
      }
    }

    // Ensure we have at least one insight per channel
    if (insights.length === 0) {
      if (risk === 'low' && m.avgSentiment >= 0) {
        insights.push(`✅ Team metrics are stable and healthy - continue current approach`);
      } else {
        insights.push(`📊 Monitor team dynamics - some metrics warrant attention`);
      }
    }

    // Limit insights per channel to avoid overwhelming
    channelInsights.set(m.channelId, insights.slice(0, 4));
  });

  return { globalInsights: globalInsights.slice(0, 5), channelInsights };
}

function filterInsightsForChannel(
  allInsights: { globalInsights: string[]; channelInsights: Map<string, string[]> },
  channelId: string
): { actionableInsights: string[] } {
  const channelSpecific = allInsights.channelInsights.get(channelId) || [];
  
  // Include relevant global insights that apply to this channel
  const relevantGlobal = allInsights.globalInsights.filter((insight: string) => 
    insight.toLowerCase().includes('team') || 
    insight.toLowerCase().includes('channel') ||
    insight.toLowerCase().includes('communication')
  );

  return {
    actionableInsights: [...channelSpecific, ...relevantGlobal.slice(0, 2)] // Limit global insights
  };
}