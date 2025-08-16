import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type Channel = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'monitoring';
};

interface ChannelSelectorProps {
  channels: Channel[];
  selectedChannels?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  channels,
  selectedChannels = [],
  onSelectionChange,
}) => {
  const [open, setOpen] = useState(false);

  const toggleChannel = (channelId: string) => {
    const newSelection = selectedChannels.includes(channelId)
      ? selectedChannels.filter(id => id !== channelId)
      : [...selectedChannels, channelId];
    
    onSelectionChange?.(newSelection);
  };

  const getStatusColor = (status: Channel['status']) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success';
      case 'inactive': return 'bg-red-500/20 text-red-500';
      case 'monitoring': return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedChannels.length > 0
            ? `${selectedChannels.length} channel(s) selected`
            : 'Select channels'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search channels..." />
          <CommandEmpty>No channels found.</CommandEmpty>
          <CommandGroup>
            {channels.map((channel) => (
              <CommandItem
                key={channel.id}
                value={channel.name}
                onSelect={() => toggleChannel(channel.id)}
                className="flex items-center"
              >
                <div 
                  className={cn(
                    'mr-2 h-2 w-2 rounded-full',
                    getStatusColor(channel.status)
                  )}
                />
                <span>{channel.name}</span>
                <Check
                  className={cn(
                    'ml-auto h-4 w-4',
                    selectedChannels.includes(channel.id)
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};