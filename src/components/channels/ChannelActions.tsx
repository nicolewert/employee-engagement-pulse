import React, { useState } from "react"
import { 
  MoreHorizontal, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCcw, 
  Trash2, 
  CheckCircle, 
  XCircle 
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

/**
 * Props interface for ChannelActions component
 */
interface ChannelActionsProps {
  channel: {
    _id: string;
    slackChannelId: string;
    channelName: string;
    isActive: boolean;
    lastSyncAt?: number;
  };
  onToggleActive: (channelId: string, isActive: boolean) => Promise<void>;
  onSync: (slackChannelId: string) => Promise<void>;
  onRemove: (channelId: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * ChannelActions component for managing channel operations
 * Provides a dropdown menu with actions like toggle, sync, and remove
 */
export function ChannelActions({
  channel, 
  onToggleActive, 
  onSync, 
  onRemove, 
  disabled = false
}: ChannelActionsProps) {
  const [isToggleLoading, setIsToggleLoading] = useState(false)
  const [isSyncLoading, setIsSyncLoading] = useState(false)
  const [isRemoveLoading, setIsRemoveLoading] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  /**
   * Handle channel status toggle
   */
  const handleToggleActive = async () => {
    setIsToggleLoading(true)
    try {
      await onToggleActive(channel._id, !channel.isActive)
      toast({
        title: channel.isActive ? "Channel Disabled" : "Channel Enabled",
        description: `${channel.channelName} monitoring has been ${channel.isActive ? "disabled" : "enabled"}`,
        variant: channel.isActive ? "destructive" : "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${channel.isActive ? "disable" : "enable"} channel`,
        variant: "destructive"
      })
    } finally {
      setIsToggleLoading(false)
    }
  }

  /**
   * Handle manual channel sync
   */
  const handleSync = async () => {
    setIsSyncLoading(true)
    try {
      await onSync(channel.slackChannelId)
      toast({
        title: "Channel Synced",
        description: `Manually synchronized ${channel.channelName}`,
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: `Could not sync ${channel.channelName}`,
        variant: "destructive"
      })
    } finally {
      setIsSyncLoading(false)
    }
  }

  /**
   * Render remove channel confirmation dialog
   */
  const handleRemove = async () => {
    setIsRemoveLoading(true)
    try {
      await onRemove(channel._id)
      toast({
        title: "Channel Removed",
        description: `${channel.channelName} has been removed from monitoring`,
        variant: "destructive"
      })
      setIsRemoveDialogOpen(false)
      } catch (error) {
        toast({
          title: "Remove Failed",
          description: `Could not remove ${channel.channelName}`,
          variant: "destructive"
        })
      } finally {
        setIsRemoveLoading(false)
      }
  }

  const renderRemoveDialog = () => {
    return (
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogTrigger asChild>
          <DropdownMenuItem 
            onSelect={(e) => e.preventDefault()} 
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Channel
          </DropdownMenuItem>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {channel.channelName} from monitoring? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemove} 
              disabled={isRemoveLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoveLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          disabled={disabled}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Channel Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Toggle Active/Inactive */}
        <DropdownMenuItem 
          onSelect={handleToggleActive} 
          disabled={isToggleLoading}
        >
          {channel.isActive ? (
            <XCircle className="mr-2 h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
          )}
          {channel.isActive ? "Disable" : "Enable"}
        </DropdownMenuItem>

        {/* Sync Channel */}
        <DropdownMenuItem 
          onSelect={handleSync} 
          disabled={isSyncLoading || !channel.isActive}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Sync Now
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        {/* Remove Channel */}
        {renderRemoveDialog()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}