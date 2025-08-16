import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Props interface for ChannelCard
interface ChannelCardProps {
  channel: {
    _id: string;
    slackChannelId: string;
    channelName: string;
    isActive: boolean;
    lastSyncAt?: number;
    lastActivity?: number;
    status?: string;
  };
  onToggleActive: (channelId: string, currentStatus: boolean) => void;
  onSync: (slackChannelId: string) => void;
  isLoading?: boolean;
}

// Utility function to format timestamp
const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return "Never synced";
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

// Determine status badge color and icon
const getStatusBadge = (isActive: boolean, status?: string) => {
  if (!isActive) {
    return {
      variant: "secondary" as const,
      label: "Inactive",
      icon: <XCircle className="w-4 h-4 mr-1 text-muted-foreground" />
    };
  }

  switch (status) {
    case "success":
      return {
        variant: "default" as const,
        label: "Active",
        icon: <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
      };
    case "error":
      return {
        variant: "destructive" as const,
        label: "Error",
        icon: <XCircle className="w-4 h-4 mr-1 text-destructive" />
      };
    default:
      return {
        variant: "outline" as const,
        label: "Pending",
        icon: <RefreshCw className="w-4 h-4 mr-1 animate-spin text-muted-foreground" />
      };
  }
};

export function ChannelCard({ 
  channel, 
  onToggleActive, 
  onSync, 
  isLoading = false 
}: ChannelCardProps) {
  const { 
    _id, 
    slackChannelId, 
    channelName, 
    isActive, 
    lastSyncAt, 
    status 
  } = channel;

  const statusBadge = getStatusBadge(isActive, status);

  return (
    <Card 
      className={`
        w-full max-w-md mx-auto rounded-2xl shadow-lg 
        transition-all duration-300 ease-in-out
        hover:shadow-xl hover:scale-[1.02]
        ${isActive ? 'border-primary/20' : 'border-muted/50'}
      `}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <CardTitle className="text-lg font-bold text-primary">
          {channelName}
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={statusBadge.variant}
                className="flex items-center"
              >
                {statusBadge.icon}
                {statusBadge.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Channel status based on recent sync
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Last Synced: {formatTimestamp(lastSyncAt)}
          </span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Active</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => onToggleActive(_id, isActive)}
                    aria-label={`Toggle ${channelName} channel activation`}
                    disabled={isLoading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isActive ? "Disable channel" : "Enable channel"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => onSync(slackChannelId)}
          disabled={!isActive || isLoading}
        >
          {isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Channel
        </Button>
      </CardContent>
    </Card>
  );
}