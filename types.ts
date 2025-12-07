export interface MetricComparison {
  name: string;
  before: number;
  after: number;
  unit: string;
}

export interface Benefit {
  label: string;
  value: number; // percentage increase/decrease
  type: 'increase' | 'decrease';
}

export interface SolarAnalysis {
  sunExposure: 'High' | 'Moderate' | 'Low';
  shadeStrategy: string;
}

export type UserPersona = 'General Planner' | 'Wheelchair User' | 'Cyclist' | 'Parent with Stroller' | 'Small Business Owner' | 'Elderly Resident';

export type DesignFocus = 'Balanced' | 'Max Greenery' | 'Pedestrian Only' | 'Night Economy' | 'Public Transit' | 'Low Cost / Tactical';

export type RenderingStyle = 'Photorealistic' | 'Watercolor Sketch' | 'Blueprint/Schematic' | 'Futuristic';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AnalysisResult {
  beforeAnalysis: {
    streetLevel: string[];
    satellite: string[];
  };
  identifiedProblems: string[];
  redesignPlan: {
    concept: string;
    interventions: string[];
  };
  metrics: {
    floorArea: MetricComparison;
    openSpace: MetricComparison;
    benefits: Benefit[];
    solar: SolarAnalysis;
  };
  imageGenerationPrompt: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  DASHBOARD = 'DASHBOARD',
  ERROR = 'ERROR'
}