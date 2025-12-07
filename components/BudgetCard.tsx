import React from 'react';
import { Sun, CloudSun } from 'lucide-react';
import { SolarAnalysis } from '../types';

interface SolarCardProps {
  solar: SolarAnalysis;
}

export const SolarCard: React.FC<SolarCardProps> = ({ solar }) => {
  return (
    <div className="bg-slate-900 rounded-lg p-5 border border-slate-800 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Solar Analysis</h4>
        {solar.sunExposure === 'High' ? <Sun size={18} className="text-amber-400" /> : <CloudSun size={18} className="text-blue-400" />}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Exposure</span>
        <span className={`font-bold ${solar.sunExposure === 'High' ? 'text-amber-400' : 'text-slate-300'}`}>
          {solar.sunExposure}
        </span>
      </div>

      <div className="text-xs text-slate-400 leading-relaxed bg-slate-800/50 p-3 rounded-md">
        <span className="text-slate-500 font-bold block mb-1">Strategy:</span>
        {solar.shadeStrategy}
      </div>
    </div>
  );
};