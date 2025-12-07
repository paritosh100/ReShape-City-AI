import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { MetricComparison, Benefit } from '../types';

interface ComparisonCardProps {
  title: string;
  metric: MetricComparison;
  color: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ title, metric, color }) => {
  const data = [
    { name: 'Before', value: metric.before },
    { name: 'After', value: metric.after },
  ];

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{metric.after.toLocaleString()}</span>
        <span className="text-xs text-slate-500 mb-1">{metric.unit}</span>
      </div>
      
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
             <XAxis type="number" hide />
             <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
            <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
              <Cell fill="#64748b" /> {/* Before color */}
              <Cell fill={color} />    {/* After color */}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
        <span>Prev: {metric.before.toLocaleString()}</span>
        <span className={metric.after > metric.before ? "text-green-400" : "text-red-400"}>
          {metric.after > metric.before ? '+' : ''}{Math.round(((metric.after - metric.before)/metric.before)*100)}%
        </span>
      </div>
    </div>
  );
};

interface BenefitListProps {
  benefits: Benefit[];
}

export const BenefitList: React.FC<BenefitListProps> = ({ benefits }) => {
  return (
    <div className="space-y-3">
      {benefits.map((benefit, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300">{benefit.label}</span>
            <span className={`font-mono font-bold ${benefit.type === 'increase' ? 'text-green-400' : 'text-emerald-400'}`}>
              {benefit.type === 'increase' ? '+' : ''}{benefit.value}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full ${benefit.type === 'increase' ? 'bg-green-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(benefit.value, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
