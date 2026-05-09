import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  color: 'brand' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  brand: { bg: 'bg-brand-50 dark:bg-brand-500/10', icon: 'text-brand-600 dark:text-brand-400', border: 'border-brand-100 dark:border-brand-500/20' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', icon: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20' },
};

export function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`glass-card p-5 animate-slide-up border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend && <span className="text-xs font-semibold text-emerald-500">{trend}</span>}
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
