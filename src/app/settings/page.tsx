"use client"

import { DashboardLayout } from "@/components/DashboardLayout"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Slack, Database, Zap, Shield, Bell } from "lucide-react"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div className="p-6 space-y-6">
          <div className="flex flex-col space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Configure your Employee Engagement Pulse dashboard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Slack className="h-5 w-5 mr-2 text-purple-600" />
                  Slack Integration
                </CardTitle>
                <CardDescription>
                  Manage your Slack app connection and channel monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Connection Status</p>
                    <p className="text-sm text-muted-foreground">Slack app integration</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-sync Channels</p>
                    <p className="text-sm text-muted-foreground">Automatically detect new messages</p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Slack App
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2 text-blue-600" />
                  Database & Storage
                </CardTitle>
                <CardDescription>
                  Convex database configuration and data retention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Database Status</p>
                    <p className="text-sm text-muted-foreground">Convex real-time database</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Retention</p>
                    <p className="text-sm text-muted-foreground">Keep insights for 90 days</p>
                  </div>
                  <Badge variant="outline">90 Days</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Manage Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                  AI & Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Claude API configuration and analysis settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Claude API Status</p>
                    <p className="text-sm text-muted-foreground">AI sentiment processing</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Analysis Mode</p>
                    <p className="text-sm text-muted-foreground">Real-time sentiment scoring</p>
                  </div>
                  <Badge variant="outline">Real-time</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Configure AI Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-orange-600" />
                  Notifications & Alerts
                </CardTitle>
                <CardDescription>
                  Configure burnout alerts and notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Burnout Alerts</p>
                    <p className="text-sm text-muted-foreground">High-risk sentiment notifications</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">Automated insight summaries</p>
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Data privacy, access controls, and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Data Encrypted</p>
                  <p className="text-sm text-green-600">All data encrypted in transit and at rest</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-800">Privacy First</p>
                  <p className="text-sm text-blue-600">No raw messages stored, AI-processed insights only</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-medium text-purple-800">Access Control</p>
                  <p className="text-sm text-purple-600">Role-based permissions and audit logs</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="flex-1">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="flex-1">
                  <Database className="h-4 w-4 mr-2" />
                  Privacy Controls
                </Button>
                <Button variant="outline" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Access Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  )
}