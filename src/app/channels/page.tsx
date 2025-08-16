"use client"

import { DashboardLayout } from "@/components/DashboardLayout"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ChannelManager } from "@/components/channels/ChannelManager"

export default function ChannelsPage() {
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <ChannelManager />
      </ErrorBoundary>
    </DashboardLayout>
  )
}