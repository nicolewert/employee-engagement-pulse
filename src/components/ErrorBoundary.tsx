"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="mt-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-red-800">Something went wrong</h3>
                    <p className="text-red-700 mt-1">
                      An unexpected error occurred while loading this component.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                          View error details
                        </summary>
                        <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                          {this.state.error.message}
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorFallback({ 
  resetError 
}: { 
  error?: Error
  resetError: () => void 
}) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <Alert className="border-red-200 bg-red-50 max-w-md">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="mt-2">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-red-800">Error loading data</h4>
              <p className="text-sm text-red-700 mt-1">
                Failed to load the requested information. Please try again.
              </p>
            </div>
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
      </div>
    </div>
  )
}