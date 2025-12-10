import React from 'react';

interface IndexMetricProps {
  label: string;
  baseline: number;
  delta: number;
  reverseColor?: boolean; // For metrics like 'Traffic Stress' where lower is better
}

export const IndexMetric: React.FC<IndexMetricProps> = ({ label, baseline, delta, reverseColor = false }) => {
  const baseNum = Number(baseline) || 0;
  const deltaNum = Number(delta) || 0;

  // Heuristic: If baseline is small (<= 1.0), assume it's 0-1 normalized and scale to 0-100.
  // We use 1.0 inclusive because index values are rarely exactly 1.0 unless normalized.
  const shouldScale = baseNum <= 1.0;
  const scaleFactor = shouldScale ? 100 : 1;
  
  const scaledBaseline = baseNum * scaleFactor;
  const scaledDelta = deltaNum * scaleFactor;
  
  const finalValue = Math.min(100, Math.max(0, scaledBaseline + scaledDelta));
  
  // Determine improvement logic
  let isImprovement = scaledDelta > 0;
  if (reverseColor) isImprovement = scaledDelta < 0; 
  
  const deltaColor = scaledDelta === 0 ? 'text-brand-muted' : (isImprovement ? 'text-brand-green' : 'text-brand-blossom');
  const barColor = isImprovement ? 'bg-brand-accent' : (scaledDelta === 0 ? 'bg-brand-surface' : 'bg-brand-blossom');
  
  const displayLabel = label ? label.replace(/_/g, ' ') : 'METRIC';

  return (
    <div className="bg-brand-dark/50 rounded-lg p-3 border border-brand-surface shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">{displayLabel}</span>
        <span className={`text-xs font-mono font-bold ${deltaColor}`}>
          {scaledDelta > 0 ? '+' : ''}{scaledDelta.toFixed(1)}
        </span>
      </div>
      
      <div className="flex items-end gap-2 mb-2">
        <span className="text-xl font-bold text-brand-text">{finalValue.toFixed(1)}</span>
        <span className="text-xs text-brand-muted mb-1">/ 100</span>
      </div>

      <div className="w-full h-2 bg-brand-panel rounded-full overflow-hidden relative border border-brand-surface">
        {/* Baseline marker */}
        <div 
          className="absolute h-full w-0.5 bg-brand-text z-10 opacity-70" 
          style={{ left: `${scaledBaseline}%` }} 
          title="Baseline"
        />
        {/* Fill bar */}
        <div 
          className={`h-full transition-all duration-500 ${barColor}`} 
          style={{ width: `${finalValue}%` }}
        />
      </div>
    </div>
  );
};