import React from 'react';
import { Wallet } from 'lucide-react';
import { CostAndFeasibility } from '../types';

interface BudgetCardProps {
  costData: CostAndFeasibility;
  selectedLevelId: number;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ costData, selectedLevelId }) => {
  // Find phases applicable to current level
  const applicablePhases = costData.phases.filter(p => p.applies_to_levels.includes(selectedLevelId));

  if (applicablePhases.length === 0) {
    // If no specific phase matches, or it's existing condition (0)
    if (selectedLevelId === 0) return null; 
    return (
       <div className="bg-brand-dark/50 rounded-lg p-5 border border-brand-surface text-center">
        <p className="text-brand-muted text-sm">No cost data available for this level.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-dark/50 rounded-lg p-4 border border-brand-surface space-y-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="text-brand-accent" size={18} />
        <h4 className="text-sm font-bold text-brand-text uppercase tracking-wider">Estimated Cost & Feasibility</h4>
      </div>

      {applicablePhases.map((phase, idx) => (
        <div key={idx} className="bg-brand-panel rounded p-3 border border-brand-surface space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-brand-text">{phase.name}</span>
            <span className="text-xs bg-brand-dark text-brand-text px-1.5 py-0.5 rounded border border-brand-surface">
              {phase.duration_months} Months
            </span>
          </div>
          
          <div className="flex items-baseline gap-1">
             <span className="text-xl font-bold text-brand-accent">
               {phase.estimated_cost_range_in_crores[0]} - {phase.estimated_cost_range_in_crores[1]}
             </span>
             <span className="text-xs text-brand-muted">Cr {costData.currency_hint}</span>
          </div>

          <p className="text-xs text-brand-muted border-t border-brand-surface pt-2 mt-2 leading-relaxed">
            {phase.feasibility_notes}
          </p>
        </div>
      ))}
      
      {costData.feasibility_heatmap.segments.length > 0 && (
         <div className="pt-2">
           <h5 className="text-[10px] font-bold text-brand-muted mb-2 uppercase tracking-wide">Feasibility Constraints</h5>
           <div className="space-y-1.5">
             {costData.feasibility_heatmap.segments.map((seg, i) => (
               <div key={i} className="flex justify-between items-center text-xs bg-brand-dark/50 px-2 py-1.5 rounded border border-brand-surface/50">
                 <span className="text-brand-muted">{seg.segment_label}</span>
                 <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                   seg.difficulty === 'easy' ? 'text-brand-dark bg-brand-green' : 
                   seg.difficulty === 'medium' ? 'text-brand-dark bg-brand-accent' : 
                   'text-brand-dark bg-brand-blossom'
                 }`}>
                   {seg.difficulty}
                 </span>
               </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
};