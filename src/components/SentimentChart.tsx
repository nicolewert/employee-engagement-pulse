import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SentimentDataPoint = {
  date: string;
  sentimentScore?: number;
  sentiment?: number;
  messageVolume?: number;
  volume?: number;
};

interface SentimentChartProps {
  data: SentimentDataPoint[];
  title?: string;
  timeRange?: string;
  showVolume?: boolean;
}

export const SentimentChart: React.FC<SentimentChartProps> = ({ 
  data, 
  title = 'Sentiment Trends',
  showVolume = true
}) => {
  const getColor = (score: number) => {
    if (score > 0.5) return 'hsl(142, 76%, 47%)';   // Success green
    if (score < -0.5) return 'hsl(316, 73%, 52%)';  // Magenta pink
    return 'hsl(47, 100%, 63%)';  // Neutral yellow
  };

  return (
    <Card className="bg-white/90 backdrop-blur-md border-none shadow-sm hover:shadow-md transition-all rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(271, 20%, 90%)" 
            />
            <XAxis 
              dataKey="date" 
              stroke="hsl(271, 20%, 70%)" 
            />
            <YAxis 
              label={{ 
                value: 'Sentiment Score', 
                angle: -90, 
                position: 'insideLeft',
                fill: "hsl(271, 81%, 56%)"
              }}
              stroke="hsl(271, 20%, 70%)" 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                borderColor: 'hsl(271, 81%, 56%)',
                borderRadius: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="sentiment"
              stroke={data.length > 0 
                ? getColor(data[data.length - 1].sentiment || data[data.length - 1].sentimentScore || 0) 
                : 'hsl(271, 81%, 56%)'
              }
              strokeWidth={3}
              dot={{ r: 6 }}
            />
            {showVolume && (
              <Line 
                type="monotone" 
                dataKey="volume"
                stroke="hsl(47, 100%, 63%)" 
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};