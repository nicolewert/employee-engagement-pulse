import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Info } from 'lucide-react';
import { ActionableRecommendationsProps } from './types';

export const ActionableRecommendations: React.FC<ActionableRecommendationsProps> = ({ 
  recommendations, 
  onActionTaken 
}) => {
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  const toggleActionCompletion = (recommendation: string) => {
    const updatedActions = completedActions.includes(recommendation)
      ? completedActions.filter(action => action !== recommendation)
      : [...completedActions, recommendation];
    
    setCompletedActions(updatedActions);
    onActionTaken(recommendation);
  };

  const getUrgencyBadge = (index: number) => {
    const urgencyLevels = [
      { label: 'Low', color: 'bg-green-100 text-green-800' },
      { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
      { label: 'High', color: 'bg-red-100 text-red-800' }
    ];
    
    return (
      <Badge 
        variant="outline" 
        className={`${urgencyLevels[index % 3].color} px-2 py-1 rounded-full text-xs`}
      >
        {urgencyLevels[index % 3].label} Priority
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-primary">
            Manager Action Items
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            <span>
              {completedActions.length} / {recommendations.length} Completed
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div 
              key={index} 
              className={`
                flex items-center space-x-4 p-4 rounded-lg border 
                ${completedActions.includes(recommendation) 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-muted'}
              `}
            >
              <Checkbox
                checked={completedActions.includes(recommendation)}
                onCheckedChange={() => toggleActionCompletion(recommendation)}
                className="border-primary"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <p 
                    className={`
                      font-medium 
                      ${completedActions.includes(recommendation) 
                        ? 'line-through text-muted-foreground' 
                        : 'text-foreground'}
                    `}
                  >
                    {recommendation}
                  </p>
                  {getUrgencyBadge(index)}
                </div>
              </div>
              {!completedActions.includes(recommendation) ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleActionCompletion(recommendation)}
                >
                  Take Action
                </Button>
              ) : (
                <Check className="text-green-500 h-5 w-5" />
              )}
            </div>
          ))}
        </div>
        
        {recommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p>No actionable recommendations at this time.</p>
            <p className="text-sm">Check back later or regenerate insights.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};