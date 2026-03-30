import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon, TrendingUp, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: string;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, color, trend, description }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">{trend}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-2">{description}</p>
            )}
          </div>
          <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center flex-shrink-0 ml-4`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
