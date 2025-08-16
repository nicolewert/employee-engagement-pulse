import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Minus, X, AlertTriangle, Users, MessageSquare } from 'lucide-react';
import { InsightCardProps } from './types';
import { ErrorBoundary } from '../ErrorBoundary';

// Safe type guards for insight data
const isValidMetrics = (metrics: unknown): metrics is { avgSentiment: number; messageCount: number; activeUsers: number } => {
  return metrics !== null && 
         metrics !== undefined &&
         typeof metrics === 'object' &&
         'avgSentiment' in metrics &&
         'messageCount' in metrics &&
         'activeUsers' in metrics &&
         typeof (metrics as any).avgSentiment === 'number' &&
         typeof (metrics as any).messageCount === 'number' &&
         typeof (metrics as any).activeUsers === 'number';
};

const isValidTrendAnalysis = (trends: unknown): trends is { sentimentChange: number; activityChange: number; engagementChange: number } => {
  return trends !== null &&
         trends !== undefined &&
         typeof trends === 'object' &&
         'sentimentChange' in trends &&
         'activityChange' in trends &&
         'engagementChange' in trends &&
         typeof (trends as any).sentimentChange === 'number' &&
         typeof (trends as any).activityChange === 'number' &&
         typeof (trends as any).engagementChange === 'number';
};

const getRiskColor = (risk: 'low' | 'medium' | 'high' | undefined | null) => {
  switch (risk) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRiskIcon = (risk: 'low' | 'medium' | 'high' | undefined | null) => {
  if (risk === 'high') return <AlertTriangle className="h-3 w-3" />;
  return null;
};

const getTrendIcon = (change: number | undefined | null) => {
  if (!change || isNaN(change)) return <Minus className="h-4 w-4 text-gray-500" />;
  if (change > 0.05) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (change < -0.05) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
};

const formatTrendChange = (change: number | undefined | null): string => {
  if (!change || isNaN(change)) return '0.0%';
  const absChange = Math.abs(change);
  if (absChange < 0.001) return '0.0%';
  if (absChange < 0.01) return (absChange * 100).toFixed(3) + '%';
  return (absChange * 100).toFixed(1) + '%';
};

const formatSentiment = (sentiment: number | undefined | null): string => {
  if (typeof sentiment !== 'number' || isNaN(sentiment)) return '0.00';
  return sentiment.toFixed(2);
};

const formatDate = (timestamp: number | undefined | null): string => {
  if (!timestamp || typeof timestamp !== 'number') return 'Unknown date';
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

export const InsightCard: React.FC<InsightCardProps> = ({ 
  insight, 
  showActions = true, 
  onDismiss 
}) => {
  // Validate insight data
  const validationError = useMemo(() => {
    if (!insight) return 'No insight data provided';
    if (!isValidMetrics(insight.metrics)) return 'Invalid metrics data';
    if (!insight.burnoutRisk) return 'Missing burnout risk assessment';
    if (!Array.isArray(insight.actionableInsights)) return 'Invalid insights data';
    return null;
  }, [insight]);

  if (validationError) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-red-200">
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">Unable to display insights</p>
                <p className="text-sm">{validationError}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { 
    metrics, 
    burnoutRisk, 
    actionableInsights, 
    trendAnalysis,
    weekStart,
    slackChannelId
  } = insight;

  // Safe data extraction with defaults
  const safeMetrics = {
    avgSentiment: typeof metrics?.avgSentiment === 'number' ? metrics.avgSentiment : 0,
    messageCount: typeof metrics?.messageCount === 'number' ? metrics.messageCount : 0,
    activeUsers: typeof metrics?.activeUsers === 'number' ? metrics.activeUsers : 0,
    threadEngagement: typeof metrics?.threadEngagement === 'number' ? metrics.threadEngagement : 0,
    reactionEngagement: typeof metrics?.reactionEngagement === 'number' ? metrics.reactionEngagement : 0
  };

  const safeTrendAnalysis = isValidTrendAnalysis(trendAnalysis) ? trendAnalysis : {
    sentimentChange: 0,
    activityChange: 0,
    engagementChange: 0
  };

  const safeInsights = Array.isArray(actionableInsights) 
    ? actionableInsights.filter(insight => typeof insight === 'string' && insight.trim().length > 0)
    : ['No insights available'];

  return (
    <ErrorBoundary>
      <Card className="w-full max-w-md mx-auto shadow-lg hover:shadow-xl transition-all duration-200">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-primary truncate">
              {slackChannelId ? `#${slackChannelId}` : 'Channel Insights'}
            </CardTitle>
            <Badge 
              className={`${getRiskColor(burnoutRisk)} px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium border`}
            >
              {getRiskIcon(burnoutRisk)}
              {burnoutRisk ? burnoutRisk.charAt(0).toUpperCase() + burnoutRisk.slice(1) : 'Unknown'} Risk
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Week of {formatDate(weekStart)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sentiment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Avg Sentiment</p>
                <div className="flex items-center gap-1">
                  {getTrendIcon(safeTrendAnalysis.sentimentChange)}
                  <span className="text-xs font-medium">
                    {formatTrendChange(safeTrendAnalysis.sentimentChange)}
                  </span>
                </div>
              </div>
              <p className="text-lg font-semibold">
                {formatSentiment(safeMetrics.avgSentiment)}
              </p>
            </div>

            {/* Activity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Messages</p>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {formatTrendChange(safeTrendAnalysis.activityChange / 100)}
                  </span>
                </div>
              </div>
              <p className="text-lg font-semibold">
                {safeMetrics.messageCount.toLocaleString()}
              </p>
            </div>

            {/* Users */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Users</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {safeMetrics.activeUsers}
                </p>
              </div>
            </div>

            {/* Engagement */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Thread Engagement</p>
              <p className="text-lg font-semibold">
                {safeMetrics.threadEngagement.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="border-t border-muted" />

          {/* Actionable Insights */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Actionable Insights
            </h3>
            {safeInsights.length === 0 ? (
              <div className="text-sm text-muted-foreground italic p-2 bg-muted/50 rounded">
                No specific insights available for this period
              </div>
            ) : (
              <ul className="space-y-2">
                {safeInsights.slice(0, 4).map((insight, index) => ( // Limit to 4 insights
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
                {safeInsights.length > 4 && (
                  <li className="text-xs text-muted-foreground italic pl-3">
                    +{safeInsights.length - 4} more insights available...
                  </li>
                )}
              </ul>
            )}
          </div>
        </CardContent>

        {showActions && (
          <CardFooter className="flex justify-between items-center pt-4">
            <Button variant="outline" size="sm" className="flex-1 mr-2">
              View Details
            </Button>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onDismiss}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
                aria-label="Dismiss insight"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </ErrorBoundary>
  );
};