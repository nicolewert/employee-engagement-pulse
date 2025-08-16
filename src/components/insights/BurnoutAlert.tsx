import React from 'react';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  AlertTriangle, 
  ShieldAlert 
} from 'lucide-react';
import { BurnoutAlertProps } from './types';

export const BurnoutAlert: React.FC<BurnoutAlertProps> = ({ 
  risk, 
  factors, 
  channelName, 
  weekStart 
}) => {
  const alertConfig = {
    low: {
      variant: "default",
      icon: <AlertCircle className="h-4 w-4" />,
      title: "Low Burnout Risk",
      description: "Minor insights detected, preventive actions recommended.",
      colorClass: "bg-green-50 border-green-200 text-green-800"
    },
    medium: {
      variant: "warning",
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Medium Burnout Risk",
      description: "Significant factors detected. Immediate attention required.",
      colorClass: "bg-yellow-50 border-yellow-200 text-yellow-800"
    },
    high: {
      variant: "destructive",
      icon: <ShieldAlert className="h-4 w-4" />,
      title: "High Burnout Risk",
      description: "Critical risk detected. Urgent intervention needed.",
      colorClass: "bg-red-50 border-red-200 text-red-800"
    }
  };

  const config = alertConfig[risk];

  return (
    <Alert className={`${config.colorClass} border-2 rounded-lg`}>
      {config.icon}
      <AlertTitle className="flex items-center justify-between">
        {config.title}
        <span className="text-sm font-normal">
          Week of {new Date(weekStart).toLocaleDateString()}
        </span>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Channel: {channelName}</p>
        <div>
          <h4 className="font-semibold mb-2">Risk Factors:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {factors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
        <div className="flex space-x-2 mt-4">
          <Button variant="outline" size="sm">
            View Detailed Report
          </Button>
          <Button size="sm" variant={risk === 'high' ? 'destructive' : 'secondary'}>
            Initiate Intervention
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};