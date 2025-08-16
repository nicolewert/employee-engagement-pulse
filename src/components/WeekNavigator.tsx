import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
// Utility imports for styling

type WeekPreset = 'thisWeek' | 'lastWeek' | 'last2Weeks';

export interface WeekNavigatorProps {
  onWeekChange?: (weekStart: number) => void;
  initialDate?: Date;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  onWeekChange,
  initialDate = new Date()
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(initialDate);

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const moveWeek = (direction: 'prev' | 'next') => {
    const { start } = getWeekDates(currentWeekStart);
    const newStart = new Date(start);
    newStart.setDate(start.getDate() + (direction === 'prev' ? -7 : 7));
    
    setCurrentWeekStart(newStart);
    const { start: weekStart } = getWeekDates(newStart);
    onWeekChange?.(weekStart.getTime());
  };

  const setPreset = (preset: WeekPreset) => {
    let presetStart = new Date();
    switch (preset) {
      case 'thisWeek':
        presetStart = new Date();
        break;
      case 'lastWeek':
        presetStart.setDate(presetStart.getDate() - 7);
        break;
      case 'last2Weeks':
        presetStart.setDate(presetStart.getDate() - 14);
        break;
    }
    
    setCurrentWeekStart(presetStart);
    const { start: weekStart } = getWeekDates(presetStart);
    onWeekChange?.(weekStart.getTime());
  };

  const { start, end } = getWeekDates(currentWeekStart);

  return (
    <div className="flex items-center space-x-4 bg-white/90 p-2 rounded-lg shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => moveWeek('prev')}
        className="hover:bg-primary/10"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
      </Button>
      
      <div className="flex-1 flex items-center justify-center space-x-2">
        <span className="text-sm font-medium text-gray-700">
          {start.toLocaleDateString()} - {end.toLocaleDateString()}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {[
              { label: 'This Week', value: 'thisWeek' },
              { label: 'Last Week', value: 'lastWeek' },
              { label: 'Last 2 Weeks', value: 'last2Weeks' },
            ].map((preset) => (
              <DropdownMenuItem 
                key={preset.value}
                onSelect={() => setPreset(preset.value as WeekPreset)}
                className="cursor-pointer hover:bg-primary/10"
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => moveWeek('next')}
        className="hover:bg-primary/10"
      >
        <ChevronRight className="h-5 w-5 text-primary" />
      </Button>
    </div>
  );
};