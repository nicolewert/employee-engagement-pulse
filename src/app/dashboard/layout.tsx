"use client"

import { DashboardLayout } from "@/components/DashboardLayout"
import { NuqsAdapter } from "nuqs/adapters/next/app"

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NuqsAdapter>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </NuqsAdapter>
  )
}