"use client"

import { useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { DashboardLayout } from "@/components/DashboardLayout"
import { ErrorBoundary, LoadingSkeleton } from "@/components/ErrorBoundary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hash, Plus, Activity, Clock } from "lucide-react"

export default function ChannelsPage() {
  const channels = useQuery(api.channels.getChannelsWithStatus)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (channel: { isActive: boolean; lastActivity: number }) => {
    if (!channel.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    const timeSinceLastActivity = Date.now() - channel.lastActivity
    const hoursAgo = timeSinceLastActivity / (1000 * 60 * 60)
    
    if (hoursAgo < 24) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    } else if (hoursAgo < 72) {
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Quiet</Badge>
    } else {
      return <Badge variant="outline" className="border-gray-300 text-gray-600">Inactive</Badge>
    }
  }

  if (!channels) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="space-y-6">
            <LoadingSkeleton className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-40 bg-muted rounded-lg" />
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
              <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
              <p className="text-muted-foreground">
                Manage Slack channels for sentiment monitoring
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </div>

          {channels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hash className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No channels added</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Get started by adding your first Slack channel to monitor team sentiment.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Channel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((channel) => (
                <Card key={channel._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lg">
                        <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                        {channel.channelName}
                      </CardTitle>
                      {getStatusBadge(channel)}
                    </div>
                    <CardDescription>
                      Added by {channel.addedBy}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Activity className="h-4 w-4 mr-2" />
                        Last Activity
                      </div>
                      <span className="font-medium">
                        {formatDate(channel.lastActivity)}
                      </span>
                    </div>
                    
                    {channel.lastSyncAt && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="h-4 w-4 mr-2" />
                          Last Sync
                        </div>
                        <span className="font-medium">
                          {formatDate(channel.lastSyncAt)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                        <Button 
                          variant={channel.isActive ? "secondary" : "default"} 
                          size="sm"
                        >
                          {channel.isActive ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  )
}