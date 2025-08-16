"use client"

import { useState, useEffect, Suspense } from "react"
import { useQuery } from "convex/react"
import { useQueryState } from "nuqs"
import { api } from "@/../convex/_generated/api"
import { MetricCard } from "@/components/MetricCard"
import { SentimentChart } from "@/components/SentimentChart"
import { ChannelSelector } from "@/components/ChannelSelector"
import { WeekNavigator } from "@/components/WeekNavigator"
import { ErrorBoundary, LoadingSkeleton } from "@/components/ErrorBoundary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, TrendingUp, Users, MessageSquare, Activity } from "lucide-react"

function getWeekStart(date: Date): number {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setUTCDate(diff))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime()
}

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function DashboardContent() {
  const [selectedWeek, setSelectedWeek] = useQueryState("week", {
    parse: (value) => parseInt(value) || getWeekStart(new Date()),
    serialize: (value) => value.toString(),
    defaultValue: getWeekStart(new Date())
  })

  const [selectedChannels, setSelectedChannels] = useQueryState("channels", {
    parse: (value) => value ? value.split(',').filter(Boolean) : [],
    serialize: (value) => value.join(','),
    defaultValue: [] as string[]
  })

  const channels = useQuery(api.channels.getChannelsWithStatus)
  const dashboardData = useQuery(api.dashboard.getWeeklyDashboard, {
    weekStart: selectedWeek,
    channelIds: selectedChannels.length > 0 ? selectedChannels : undefined
  })
  const burnoutAlerts = useQuery(api.dashboard.getBurnoutAlerts, {
    riskLevel: "high"
  })

  const [selectedChannelForTrends, setSelectedChannelForTrends] = useState<string>("")
  const trendData = useQuery(
    api.dashboard.getSentimentTrends,
    selectedChannelForTrends ? {
      channelId: selectedChannelForTrends,
      days: 7
    } : "skip"
  )

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelForTrends) {
      setSelectedChannelForTrends(channels[0].slackChannelId)
    }
  }, [channels, selectedChannelForTrends])

  const handleWeekChange = (newWeek: number) => {
    setSelectedWeek(newWeek)
  }

  // Channel selection is handled by ChannelSelector component

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      default: return 'text-green-500'
    }
  }

  const getRiskBgColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-50 border-red-200'
      case 'medium': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-green-50 border-green-200'
    }
  }

  if (!channels) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <LoadingSkeleton className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
          <LoadingSkeleton className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Team sentiment insights for {formatWeekRange(selectedWeek)}
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <ChannelSelector
            channels={channels.map(c => ({
              id: c.slackChannelId,
              name: c.channelName,
              status: c.isActive ? 'active' : 'inactive' as const
            }))}
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />
          <WeekNavigator
            onWeekChange={handleWeekChange}
          />
        </div>
      </div>

      {burnoutAlerts && burnoutAlerts.length > 0 && (
        <Alert className={getRiskBgColor('high')}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>High Burnout Risk Detected:</strong> {burnoutAlerts.length} channel(s) showing concerning sentiment patterns.
            {burnoutAlerts.slice(0, 2).map((alert, index) => (
              <span key={index} className="block mt-1 text-sm">
                • {channels?.find(c => c.slackChannelId === alert.slackChannelId)?.channelName || alert.slackChannelId}: {alert.riskFactors.join(', ')}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {dashboardData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Average Sentiment"
              value={dashboardData.aggregatedMetrics.avgSentiment}
              format="sentiment"
              subtitle={`Across ${dashboardData.channelCount} channels`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              title="Active Users"
              value={dashboardData.aggregatedMetrics.activeUsers}
              format="number"
              subtitle="This week"
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Messages"
              value={dashboardData.aggregatedMetrics.messageCount}
              format="number" 
              subtitle="Total this week"
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <MetricCard
              title="Thread Engagement"
              value={dashboardData.aggregatedMetrics.threadEngagement}
              format="percent"
              subtitle="Messages with replies"
              icon={<Activity className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trends</CardTitle>
                <CardDescription>
                  7-day sentiment pattern for{" "}
                  {selectedChannelForTrends && channels ? 
                    channels.find(c => c.slackChannelId === selectedChannelForTrends)?.channelName || "selected channel"
                    : "all channels"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendData && trendData.data.length > 0 ? (
                  <SentimentChart
                    data={trendData.data}
                    timeRange="week"
                    showVolume={true}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No sentiment data available for the selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Burnout Risk Assessment</CardTitle>
                <CardDescription>
                  Current risk levels across monitored channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${getRiskBgColor(dashboardData.burnoutRisk)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Risk Level</span>
                      <span className={`font-bold capitalize ${getRiskColor(dashboardData.burnoutRisk)}`}>
                        {dashboardData.burnoutRisk}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on sentiment analysis across {dashboardData.channelCount} channels
                    </p>
                  </div>
                  
                  {dashboardData.channels.map((channel) => {
                    const channelInfo = channels.find(c => c.slackChannelId === channel.channelId)
                    const risk = channel.metrics.avgSentiment < -0.3 ? 'high' : 
                               channel.metrics.avgSentiment < 0.1 ? 'medium' : 'low'
                    return (
                      <div key={channel.channelId} className="flex items-center justify-between py-2">
                        <div>
                          <span className="font-medium">{channelInfo?.channelName || channel.channelId}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({channel.metrics.messageCount} messages)
                          </span>
                        </div>
                        <span className={`text-sm font-medium capitalize ${getRiskColor(risk)}`}>
                          {risk}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}