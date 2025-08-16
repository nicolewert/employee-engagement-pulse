import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InsightGeneratorProps } from './types';
import { ErrorBoundary } from '../ErrorBoundary';

interface GenerationState {
  status: 'idle' | 'generating' | 'success' | 'error';
  message?: string;
  lastGenerated?: number;
}

export const InsightGenerator: React.FC<InsightGeneratorProps> = ({ 
  onGenerate, 
  isGenerating, 
  weekStart: initialWeekStart, 
  channels 
}) => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date(initialWeekStart));
  const [generationState, setGenerationState] = useState<GenerationState>({ status: 'idle' });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate inputs
  const validateInputs = useCallback((): string | null => {
    if (!weekStart) {
      return "Please select a week start date";
    }

    const selectedDate = weekStart.getTime();
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000);

    if (selectedDate > oneWeekFromNow) {
      return "Week start date cannot be more than one week in the future";
    }

    if (selectedDate < oneYearAgo) {
      return "Week start date cannot be more than one year in the past";
    }

    if (selectedChannels.length === 0) {
      return "Please select at least one channel";
    }

    if (selectedChannels.length > 20) {
      return "Please select no more than 20 channels to avoid timeouts";
    }

    return null;
  }, [weekStart, selectedChannels]);

  const handleGenerate = useCallback(async () => {
    // Clear previous errors
    setValidationError(null);
    
    // Validate inputs
    const error = validateInputs();
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      setGenerationState({ status: 'generating', message: 'Analyzing team communication patterns...' });
      
      // Call the parent's generate function - it returns void, so we assume success
      await onGenerate(weekStart.getTime(), selectedChannels);
      
      // Assume success since onGenerate doesn't return a result
      setGenerationState({ 
        status: 'success', 
        message: `Successfully generated insights for ${selectedChannels.length} channels`,
        lastGenerated: Date.now()
      });

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setGenerationState(prev => prev.status === 'success' ? { ...prev, message: undefined } : prev);
      }, 5000);

    } catch (error) {
      console.error('Insight generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationState({ 
        status: 'error', 
        message: errorMessage 
      });
    }
  }, [weekStart, selectedChannels, onGenerate, validateInputs]);

  // Handle channel selection with validation
  const handleChannelToggle = useCallback((channelId: string) => {
    setSelectedChannels(prev => {
      const newSelection = prev.includes(channelId)
        ? prev.filter(ch => ch !== channelId)
        : [...prev, channelId];
      
      // Clear validation error when user makes changes
      if (validationError) {
        setValidationError(null);
      }
      
      return newSelection;
    });
  }, [validationError]);

  // Handle week start change
  const handleWeekStartChange = useCallback((date: Date | undefined) => {
    if (date) {
      setWeekStart(date);
      // Clear validation error when user makes changes
      if (validationError) {
        setValidationError(null);
      }
    }
  }, [validationError]);

  return (
    <ErrorBoundary>
      <div className="bg-background p-6 rounded-xl shadow-sm border border-muted">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">
            Generate Weekly Insights
          </h2>
          {generationState.lastGenerated && (
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Last generated: {format(new Date(generationState.lastGenerated), 'HH:mm')}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {validationError && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {validationError}
            </AlertDescription>
          </Alert>
        )}

        {generationState.status === 'error' && generationState.message && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-start justify-between">
                <span>{generationState.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGenerationState({ status: 'idle' })}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100 ml-2"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {generationState.status === 'success' && generationState.message && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {generationState.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {/* Week Start Date Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Week Start Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !weekStart && "text-muted-foreground",
                    validationError && validationError.includes('date') && "border-orange-300"
                  )}
                  disabled={isGenerating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {weekStart ? format(weekStart, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={handleWeekStartChange}
                  initialFocus
                  disabled={isGenerating}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Channel Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Select Channels
              <span className="text-xs ml-1 text-muted-foreground">({selectedChannels.length}/{channels.length})</span>
            </label>
            <Select 
              onValueChange={handleChannelToggle}
              value=""
              disabled={isGenerating || channels.length === 0}
            >
              <SelectTrigger className={cn(
                validationError && validationError.includes('channel') && "border-orange-300"
              )}>
                <SelectValue placeholder={channels.length === 0 ? "No channels available" : "Choose channels"}>
                  {selectedChannels.length > 0 
                    ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''} selected`
                    : "Select channels"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {channels.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No channels available
                  </div>
                ) : (
                  channels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      <div className="flex items-center w-full">
                        <input 
                          type="checkbox" 
                          checked={selectedChannels.includes(channel)}
                          className="mr-2"
                          readOnly
                        />
                        <span className="truncate">{channel}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {/* Quick selection buttons */}
            {channels.length > 0 && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedChannels(channels)}
                  disabled={isGenerating}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedChannels([])}
                  disabled={isGenerating}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex flex-col justify-end">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || selectedChannels.length === 0 || channels.length === 0}
              className={cn(
                "w-full",
                generationState.status === 'generating' && "cursor-wait"
              )}
              size="lg"
            >
              {generationState.status === 'generating' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {generationState.message || 'Generating...'}
                </>
              ) : (
                <>
                  Generate Insights
                  {selectedChannels.length > 0 && (
                    <span className="ml-2 text-xs opacity-75">
                      ({selectedChannels.length})
                    </span>
                  )}
                </>
              )}
            </Button>
            
            {selectedChannels.length > 0 && !isGenerating && (
              <div className="text-xs text-muted-foreground text-center mt-2">
                Analysis will cover 7 days from {format(weekStart, 'MMM dd')}
              </div>
            )}
          </div>
        </div>

        {/* Help text */}
        {channels.length === 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              No channels available. Please add some channels first to generate insights.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};