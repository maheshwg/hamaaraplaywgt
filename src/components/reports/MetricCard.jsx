import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

export default function MetricCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = "indigo" }) {
  const colorStyles = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', accent: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'bg-emerald-500' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', accent: 'bg-rose-500' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'bg-amber-500' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', accent: 'bg-violet-500' },
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
              {subtitle && (
                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
              )}
              {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span>{trendUp ? '↑' : '↓'}</span>
                  <span>{trend}% from last week</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${styles.bg}`}>
              <Icon className={`h-6 w-6 ${styles.icon}`} />
            </div>
          </div>
          <div className={`h-1 ${styles.accent} rounded-full mt-4 opacity-20`} />
        </CardContent>
      </Card>
    </motion.div>
  );
}