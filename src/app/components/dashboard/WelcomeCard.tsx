import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon } from 'lucide-react';

interface WelcomeCardProps {
  title: string;
  subtitle: string;
  tone?: 'primary' | 'secondary' | 'accent';
  gradientFrom?: string;
  gradientTo?: string;
  icon?: LucideIcon;
  badgeText?: string;
}

export function WelcomeCard({ 
  title, 
  subtitle, 
  tone = 'primary',
  gradientFrom, 
  gradientTo, 
  icon: Icon, 
  badgeText 
}: WelcomeCardProps) {
  const toneGradient: Record<NonNullable<WelcomeCardProps['tone']>, string> = {
    primary: 'from-primary to-primary/85',
    secondary: 'from-secondary to-secondary/85',
    accent: 'from-accent to-accent/85',
  };

  const toneForeground: Record<NonNullable<WelcomeCardProps['tone']>, string> = {
    primary: 'text-primary-foreground',
    secondary: 'text-secondary-foreground',
    accent: 'text-accent-foreground',
  };

  const backgroundClassName =
    gradientFrom && gradientTo
      ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`
      : `bg-gradient-to-br ${toneGradient[tone]} ${toneForeground[tone]}`;

  return (
    <Card className={`border-none shadow-sm overflow-hidden relative ${backgroundClassName}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-background/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-background/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <CardContent className="p-8 relative z-10">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="opacity-90 text-lg">{subtitle}</p>
        {(Icon || badgeText) && (
          <div className="mt-4 inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-background/20">
            {Icon && <Icon className="w-4 h-4" />}
            {badgeText && <span className="text-sm">{badgeText}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
