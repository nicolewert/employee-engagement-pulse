import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Search, RefreshCw } from 'lucide-react';
import { AddChannelDialog } from './AddChannelDialog';

interface ChannelStatus {
  _id: string;
  slackChannelId: string;
  channelName: string;
  isActive: boolean;
  lastSyncAt?: number;
  lastActivity?: number;
  status?: string;
}

export function ChannelManager() {
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false);

  // Convex hooks for data and mutations
  const channels = useQuery(api.channels.getChannelsWithStatus) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const toggleChannelActive = useMutation(api.channels.toggleChannelActive);
  const syncSlackChannel = useAction(api.slack.syncSlackChannel);
  
  // Refresh channels after adding a new one
  const handleChannelAdded = () => {
    // Optional: if you want to trigger a specific refresh logic
  };

  // Filtering and searching logic
  const filteredChannels = useMemo(() => {
    return channels.filter((channel: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const matchesSearch = channel.channelName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActiveFilter = filterActive === null || channel.isActive === filterActive;
      return matchesSearch && matchesActiveFilter;
    });
  }, [channels, searchTerm, filterActive]);

  // Handle channel sync
  const handleSync = async (slackChannelId: string) => {
    try {
      await syncSlackChannel({ channelId: slackChannelId });
    } catch (error) {
      console.error('Failed to sync channel:', error);
      // TODO: Add user-friendly error toast
    }
  };

  // Handle channel activation toggle
  const handleToggleActive = async (channelId: string, currentStatus: boolean) => {
    try {
      await toggleChannelActive({ 
        channelId: channelId as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- channelId is the internal Convex ID
        isActive: !currentStatus 
      });
    } catch (error) {
      console.error('Failed to toggle channel status:', error);
      // TODO: Add user-friendly error toast
    }
  };

  // Format last sync time
  const formatLastSyncTime = (timestamp?: number) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6 p-4 bg-background">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Channel Manager</h1>
        <Button 
          variant="default" 
          className="bg-secondary hover:bg-secondary/90"
          onClick={() => setIsAddChannelDialogOpen(true)}
        >
          Add Channel
        </Button>
        
        {/* Add Channel Dialog */}
        <AddChannelDialog 
          open={isAddChannelDialogOpen}
          onOpenChange={setIsAddChannelDialogOpen}
          onChannelAdded={handleChannelAdded}
        />
      </div>

      {/* Search and Filter Controls */}
      <div className="flex space-x-4 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search channels..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Active Channels</span>
          <Switch 
            checked={filterActive ?? undefined}
            onCheckedChange={(checked) => setFilterActive(
              checked === true ? true : 
              checked === false ? false : 
              null
            )}
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChannels.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            No channels found
          </div>
        ) : (
          filteredChannels.map((channel: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
            <Card 
              key={channel.slackChannelId} 
              className={`
                transition-all duration-300 
                ${channel.isActive 
                  ? 'border-primary/30 hover:border-primary/50' 
                  : 'border-muted/30 hover:border-muted/50'}
              `}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {channel.channelName}
                </CardTitle>
                <Badge 
                  variant={channel.isActive ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {channel.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Last Sync: {formatLastSyncTime(channel.lastSyncAt)}
                    </span>
                    <Switch 
                      checked={channel.isActive}
                      onCheckedChange={() => handleToggleActive(channel._id, channel.isActive)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSync(channel.slackChannelId)}
                      disabled={!channel.isActive}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Active monitoring
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default ChannelManager;