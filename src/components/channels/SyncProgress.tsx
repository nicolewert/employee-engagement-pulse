import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import { cn } from "@/lib/utils";

// Status color mapping based on Creative Playground theme
const STATUS_COLORS = {
  starting: 'bg-primary/20',
  syncing: 'bg-secondary/20',
  completed: 'bg-success/20',
  failed: 'bg-destructive/20',
  cancelled: 'bg-muted/20'
};

const STATUS_ICONS = {
  starting: Clock,
  syncing: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: X
};

// Utility function to format time
const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export interface SyncProgressProps {
  progress: ChannelSyncProgress;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export interface ChannelSyncProgress {
  channelId: string;
  status: 'starting' | 'syncing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalMessages: number;
  syncedMessages: number;
  estimatedTimeRemaining?: number;
  error?: string;
  startTime: number;
  lastUpdateTime: number;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  progress,
  onCancel,
  onRetry,
  className
}) => {
  const StatusIcon = STATUS_ICONS[progress.status];
  const progressPercentage = Math.min(Math.max(progress.progress, 0), 100);
  
  // Calculate time details
  const elapsedTime = progress.lastUpdateTime - progress.startTime;
  const timeRemaining = progress.estimatedTimeRemaining || 0;

  return (
    <Card 
      className={cn(
        "w-full max-w-md mx-auto shadow-lg transition-all duration-300 ease-in-out",
        STATUS_COLORS[progress.status],
        className
      )}
    >
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <StatusIcon className="w-6 h-6" />
        <CardTitle className="flex-grow capitalize">
          {progress.status} Progress
        </CardTitle>
        <Badge variant="outline" className="bg-background">
          {progress.channelId}
        </Badge>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <Progress 
            value={progressPercentage} 
            className="w-full h-2 bg-primary/10"
          />
          
          {/* Progress Details */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {progress.syncedMessages} / {progress.totalMessages} Messages
            </span>
            <span>
              {formatTime(timeRemaining)} Remaining
            </span>
          </div>
          
          {/* Error Handling */}
          {progress.status === 'failed' && progress.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Sync Failed</AlertTitle>
              <AlertDescription>{progress.error}</AlertDescription>
            </Alert>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-2 mt-4">
            {onCancel && progress.status !== 'completed' && (
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" /> Cancel Sync
              </Button>
            )}
            
            {onRetry && (progress.status === 'failed' || progress.status === 'cancelled') && (
              <Button 
                variant="default" 
                onClick={onRetry} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Sync
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncProgress;