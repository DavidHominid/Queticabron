import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon, TrendingUp, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'muted';
  trend?: string;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, tone = 'primary', trend, description }: StatCardProps) {
  const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    accent: 'bg-accent text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    muted: 'bg-muted text-foreground',
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{title}</p>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">{trend}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground/70 mt-2">{description}</p>
            )}
          </div>
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ml-4 ${toneStyles[tone]}`}
          >
            <Icon className="w-7 h-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
