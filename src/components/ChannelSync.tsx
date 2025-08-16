'use client'

import { useEffect, useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface SyncStatus {
  channelId: string
  channelName: string
  isActive: boolean
  lastSyncAt?: number
  isSyncing: boolean
  error?: string
}

export function ChannelSync() {
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map())
  const channels = useQuery(api.channels.getAllChannels)
  const syncChannel = useAction(api.slack.syncSlackChannel)
  const processUnanalyzed = useAction(api.slack.processUnanalyzedMessages)

  // Initialize sync statuses when channels load
  useEffect(() => {
    if (channels) {
      const newStatuses = new Map<string, SyncStatus>()
      channels.forEach(channel => {
        newStatuses.set(channel.slackChannelId, {
          channelId: channel.slackChannelId,
          channelName: channel.channelName,
          isActive: channel.isActive,
          lastSyncAt: channel.lastSyncAt,
          isSyncing: false
        })
      })
      setSyncStatuses(newStatuses)
    }
  }, [channels])

  const handleChannelSync = async (channelId: string, hours: number = 24) => {
    setSyncStatuses(prev => {
      const newStatuses = new Map(prev)
      const status = newStatuses.get(channelId)
      if (status) {
        status.isSyncing = true
        status.error = undefined
      }
      return newStatuses
    })

    try {
      await syncChannel({
        channelId,
        hours
      })

      setSyncStatuses(prev => {
        const newStatuses = new Map(prev)
        const status = newStatuses.get(channelId)
        if (status) {
          status.isSyncing = false
          status.lastSyncAt = Date.now()
        }
        return newStatuses
      })
    } catch (error) {
      setSyncStatuses(prev => {
        const newStatuses = new Map(prev)
        const status = newStatuses.get(channelId)
        if (status) {
          status.isSyncing = false
          status.error = String(error)
        }
        return newStatuses
      })
    }
  }

  const handleProcessUnanalyzed = async () => {
    try {
      const result = await processUnanalyzed()
      console.log('Processed unanalyzed messages:', result)
    } catch (error) {
      console.error('Error processing unanalyzed messages:', error)
    }
  }

  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) return 'Never'
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getSyncStatusBadge = (status: SyncStatus) => {
    if (status.isSyncing) {
      return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>
    }
    if (status.error) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>
    }
    if (status.lastSyncAt) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
  }

  if (!channels) {
    return <div>Loading channels...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Channel Sync Status
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessUnanalyzed} 
            size="sm" 
            variant="outline"
          >
            Process Unanalyzed Messages
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from(syncStatuses.values()).map((status, index) => (
            <div key={status.channelId}>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{status.channelName}</div>
                    <div className="text-sm text-muted-foreground">
                      Last sync: {formatLastSync(status.lastSyncAt)}
                    </div>
                    {status.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {status.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getSyncStatusBadge(status)}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={status.isSyncing || !status.isActive}
                      onClick={() => handleChannelSync(status.channelId, 1)}
                    >
                      1h
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={status.isSyncing || !status.isActive}
                      onClick={() => handleChannelSync(status.channelId, 24)}
                    >
                      24h
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={status.isSyncing || !status.isActive}
                      onClick={() => handleChannelSync(status.channelId, 168)}
                    >
                      7d
                    </Button>
                  </div>
                </div>
              </div>
              {index < syncStatuses.size - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}