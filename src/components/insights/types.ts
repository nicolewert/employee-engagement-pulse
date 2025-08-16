import { Id } from "@/convex/_generated/dataModel";

export interface WeeklyInsight {
  _id: Id<"weeklyInsights">;
  weekStart: number;
  weekEnd: number;
  slackChannelId: string;
  metrics: {
    avgSentiment: number;
    messageCount: number;
    activeUsers: number;
    threadEngagement: number;
    reactionEngagement: number;
  };
  burnoutRisk: 'low' | 'medium' | 'high';
  riskFactors: string[];
  actionableInsights: string[];
  trendAnalysis: {
    sentimentChange: number;
    activityChange: number;
    engagementChange: number;
  };
  generatedAt: number;
  generatedBy: 'system' | 'manual';
}

export interface InsightCardProps {
  insight: WeeklyInsight;
  showActions?: boolean;
  onDismiss?: () => void;
}

export interface BurnoutAlertProps {
  risk: 'low' | 'medium' | 'high';
  factors: string[];
  channelName: string;
  weekStart: number;
}

export interface InsightGeneratorProps {
  onGenerate: (weekStart: number, channels: string[]) => Promise<void> | void;
  isGenerating: boolean;
  weekStart: number;
  channels: string[];
}

export interface ActionableRecommendationsProps {
  recommendations: string[];
  onActionTaken: (recommendation: string) => void;
}