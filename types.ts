
export interface Context {
  location_guess: string;
  user_goals: string;
}

export interface BaselineAnalysis {
  visual_summary: string;
  key_problems: string[];
  spatial_metrics: {
    estimated_street_width_m: number;
    existing_lanes: number;
    sidewalk_width_m: number;
  };
  baseline_metrics: {
    walkability_index: number;
    green_cover_index: number;
    traffic_stress_index: number;
    public_space_index: number;
    accessibility_index: number;
    safety_index: number;
  };
}

export interface MetricDeltas {
  walkability_index: number;
  green_cover_index: number;
  traffic_stress_index: number;
  public_space_index: number;
  accessibility_index: number;
  safety_index: number;
}

export interface RedesignLevel {
  id: number;
  label: string;
  description: string;
  interventions: string[];
  metric_deltas: MetricDeltas;
}

export interface CostPhase {
  name: string;
  applies_to_levels: number[];
  estimated_cost_range_in_crores: [number, number];
  duration_months: number;
  feasibility_notes: string;
}

export interface FeasibilitySegment {
  segment_label: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
}

export interface CostAndFeasibility {
  currency_hint: string;
  phases: CostPhase[];
  feasibility_heatmap: {
    segments: FeasibilitySegment[];
  };
}

export interface SocialIndicator {
  name: string;
  unit: string;
  baseline: number;
  after: number;
  explanation: string;
}

export interface SocialImpact {
  target_level_id: number;
  summary: string;
  indicators: SocialIndicator[];
}

export interface ClimateScenario {
  type: string;
  baseline_behaviour: string;
  redesigned_behaviour: string;
  key_measures: string[];
}

export interface AccessibilityAnalysis {
  baseline_issues: string[];
  redesign_measures: string[];
  accessibility_score_change: {
    baseline: number;
    after: number;
  };
}

export interface BusinessOpportunityNode {
  label: string;
  recommended_use: string;
  justification: string;
}

export interface BusinessOpportunities {
  summary: string;
  opportunity_nodes: BusinessOpportunityNode[];
}

export interface ImageGenerationPrompts {
  for_level_50: string;
  for_level_75: string;
  for_level_100: string;
}

export interface ReShapeResult {
  context: Context;
  baseline_analysis: BaselineAnalysis;
  redesign_levels: {
    levels: RedesignLevel[];
  };
  cost_and_feasibility: CostAndFeasibility;
  social_impact: SocialImpact;
  climate_stress_test: {
    scenarios: ClimateScenario[];
  };
  accessibility_analysis: AccessibilityAnalysis;
  business_opportunities: BusinessOpportunities;
  audio_tour_script: {
    duration_seconds: number;
    tone: string;
    script: string;
  };
  image_generation_prompts: ImageGenerationPrompts;
}

// Keep generic types
export type UserPersona = 'General Planner' | 'Wheelchair User' | 'Cyclist' | 'Parent with Stroller' | 'Small Business Owner' | 'Elderly Resident';
export type RenderingStyle = 'Photorealistic' | 'Watercolor Sketch' | 'Blueprint/Schematic' | 'Futuristic';
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  DASHBOARD = 'DASHBOARD',
  ERROR = 'ERROR'
}
