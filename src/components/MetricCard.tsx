import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MetricFormat = 'number' | 'percent' | 'sentiment';

export interface MetricCardProps {
  title: string;
  value: number | string;
  format?: MetricFormat;
  trend?: number;
  subtitle?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  format = 'number',
  trend,
  subtitle,
  className,
  icon
}) => {
  const renderValue = () => {
    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'percent':
        return typeof value === 'number' 
          ? `${(value * 100).toFixed(1)}%` 
          : value;
      case 'sentiment':
        return typeof value === 'number' 
          ? value > 0 
            ? `Positive ${value.toFixed(1)}` 
            : value < 0 
              ? `Negative ${Math.abs(value).toFixed(1)}` 
              : 'Neutral'
          : value;
    }
  };

  const trendColor = trend && trend > 0 
    ? 'text-success' 
    : trend && trend < 0 
      ? 'text-red-500' 
      : 'text-gray-500';

  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(
      'bg-white/90 backdrop-blur-md border-none shadow-sm hover:shadow-md transition-all',
      'rounded-xl p-2 space-y-2 group',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-primary">{icon}</div>}
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-bold text-primary">
            {renderValue()}
          </span>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center text-sm font-medium', 
              trendColor
            )}>
              <TrendIcon className="w-4 h-4 mr-1" />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 group-hover:text-gray-700">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};