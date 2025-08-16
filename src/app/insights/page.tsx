"use client"

import { useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { DashboardLayout } from "@/components/DashboardLayout"
import { ErrorBoundary, LoadingSkeleton } from "@/components/ErrorBoundary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, TrendingUp, AlertTriangle, Calendar, Hash } from "lucide-react"

function getWeekStart(date: Date): number {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setUTCDate(diff))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime()
}

export default function InsightsPage() {
  const currentWeek = getWeekStart(new Date())
  const weeklyInsights = useQuery(api.dashboard.getWeeklyInsights, {
    weekStart: currentWeek
  })
  const burnoutAlerts = useQuery(api.dashboard.getBurnoutAlerts, {})
  const channels = useQuery(api.channels.getChannelsWithStatus)

  const formatWeekRange = (weekStart: number): string => {
    const start = new Date(weekStart)
    const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Risk color utility moved inline for better performance

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      default: return 'default'
    }
  }

  const getChannelName = (slackChannelId: string) => {
    return channels?.find(c => c.slackChannelId === slackChannelId)?.channelName || slackChannelId
  }

  if (!weeklyInsights || !burnoutAlerts || !channels) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="space-y-6">
            <LoadingSkeleton className="h-8 bg-muted rounded w-48" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div className="p-6 space-y-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
              <p className="text-muted-foreground">
                AI-generated team sentiment analysis and recommendations
              </p>
            </div>
          </div>

          {burnoutAlerts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Burnout Alerts
              </h2>
              {burnoutAlerts.map((alert, index) => (
                <Alert key={index} className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4" />
                          <span className="font-medium">{getChannelName(alert.slackChannelId)}</span>
                        </div>
                        <Badge variant={getRiskBadgeVariant(alert.burnoutRisk)} className="capitalize">
                          {alert.burnoutRisk} Risk
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">Risk Factors:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {alert.riskFactors.map((factor: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {alert.actionableInsights.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">Recommended Actions:</p>
                          <ul className="text-sm text-red-600 space-y-1">
                            {alert.actionableInsights.slice(0, 3).map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">→</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
              Weekly Insights
            </h2>

            {weeklyInsights.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No insights available</h3>
                  <p className="text-muted-foreground text-center">
                    Weekly insights will appear here once there&apos;s enough data from your monitored channels.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {weeklyInsights.map((insight) => (
                  <Card key={insight._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <CardTitle>{getChannelName(insight.slackChannelId)}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRiskBadgeVariant(insight.burnoutRisk)} className="capitalize">
                            {insight.burnoutRisk} Risk
                          </Badge>
                          <Badge variant="outline">
                            {formatWeekRange(insight.weekStart)}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Generated on {new Date(insight.generatedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {insight.metrics.avgSentiment.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Sentiment</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {insight.metrics.messageCount}
                          </div>
                          <div className="text-sm text-muted-foreground">Messages</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {insight.metrics.activeUsers}
                          </div>
                          <div className="text-sm text-muted-foreground">Active Users</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {insight.metrics.threadEngagement.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Thread Engagement</div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Trend Analysis
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Sentiment Change:</span>
                              <span className={insight.trendAnalysis.sentimentChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {insight.trendAnalysis.sentimentChange >= 0 ? '+' : ''}
                                {insight.trendAnalysis.sentimentChange.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Activity Change:</span>
                              <span className={insight.trendAnalysis.activityChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {insight.trendAnalysis.activityChange >= 0 ? '+' : ''}
                                {insight.trendAnalysis.activityChange.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Engagement Change:</span>
                              <span className={insight.trendAnalysis.engagementChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {insight.trendAnalysis.engagementChange >= 0 ? '+' : ''}
                                {insight.trendAnalysis.engagementChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {insight.actionableInsights.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-2" />
                              Recommendations
                            </h4>
                            <ul className="text-sm space-y-2">
                              {insight.actionableInsights.map((actionItem: string, idx: number) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2 text-primary">→</span>
                                  <span>{actionItem}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  )
}