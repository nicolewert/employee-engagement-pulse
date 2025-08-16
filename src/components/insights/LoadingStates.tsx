import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Clock, TrendingUp } from 'lucide-react';

export const InsightCardSkeleton: React.FC = () => {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>

        <div className="border-t border-muted" />

        {/* Insights */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const InsightGeneratorSkeleton: React.FC = () => {
  return (
    <Card className="bg-background p-6 rounded-xl shadow-sm border border-muted">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

interface GeneratingProgressProps {
  stage: 'fetching' | 'analyzing' | 'generating' | 'storing';
  message?: string;
  progress?: number;
}

export const GeneratingProgress: React.FC<GeneratingProgressProps> = ({ 
  stage, 
  message, 
  progress 
}) => {
  const getStageInfo = (currentStage: string) => {
    const stages = {
      fetching: { label: 'Fetching Data', icon: Clock, color: 'text-blue-500' },
      analyzing: { label: 'Analyzing Patterns', icon: TrendingUp, color: 'text-yellow-500' },
      generating: { label: 'Generating Insights', icon: RefreshCw, color: 'text-purple-500' },
      storing: { label: 'Saving Results', icon: Clock, color: 'text-green-500' }
    };
    return stages[currentStage as keyof typeof stages] || stages.fetching;
  };

  const stageInfo = getStageInfo(stage);
  const Icon = stageInfo.icon;

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-dashed border-primary/30">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <Icon className={`h-8 w-8 ${stageInfo.color} ${stage === 'generating' ? 'animate-spin' : 'animate-pulse'}`} />
            {progress && (
              <div className="absolute inset-0 border-2 border-primary/20 rounded-full">
                <div 
                  className="border-2 border-primary rounded-full transition-all duration-500"
                  style={{ 
                    transform: `rotate(${(progress / 100) * 360}deg)`,
                    clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">
              {stageInfo.label}
            </h3>
            <p className="text-sm text-muted-foreground">
              {message || `${stageInfo.label.toLowerCase()}...`}
            </p>
            
            {progress && (
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-primary rounded-full h-1.5 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="flex gap-1">
              {['fetching', 'analyzing', 'generating', 'storing'].map((s, index) => (
                <div
                  key={s}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    s === stage 
                      ? 'bg-primary animate-pulse' 
                      : index < ['fetching', 'analyzing', 'generating', 'storing'].indexOf(stage)
                        ? 'bg-primary/60'
                        : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const InsightListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <InsightCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const EmptyInsightsState: React.FC<{ 
  onGenerate?: () => void;
  message?: string;
}> = ({ 
  onGenerate, 
  message = "No insights available yet" 
}) => {
  return (
    <Card className="w-full max-w-md mx-auto border-dashed border-2 border-muted-foreground/20">
      <CardContent className="p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">
              {message}
            </h3>
            <p className="text-sm text-muted-foreground">
              Generate weekly insights to see team engagement patterns and actionable recommendations.
            </p>
          </div>

          {onGenerate && (
            <button
              onClick={onGenerate}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Generate insights →
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Add skeleton component to ui folder for consistency
export { Skeleton } from "@/components/ui/skeleton";