import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Map as MapIcon, AlertTriangle, Loader2, RefreshCw, 
  Volume2, VolumeX, TrendingUp, Thermometer, Store, Send, Sliders,
  Ruler, TreeDeciduous, Car
} from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import { IndexMetric } from './components/MetricCard';
import { BudgetCard } from './components/BudgetCard';
import ChatAssistant from './components/ChatAssistant';
import Logo from './components/Logo';
import { analyzeUrbanImages, generateRedesignVisualization } from './services/geminiService';
import { ReShapeResult, AppState, UserPersona, RenderingStyle } from './types';

const PERSONAS: UserPersona[] = [
  'General Planner', 'Wheelchair User', 'Cyclist', 'Parent with Stroller', 'Small Business Owner', 'Elderly Resident'
];

const STYLES: RenderingStyle[] = [
  'Photorealistic', 'Watercolor Sketch', 'Blueprint/Schematic', 'Futuristic'
];

const FOCUS_AREAS = [
  'General Improvement', 'Pedestrian & Bike Friendly', 'Maximize Greenery', 'Night Economy & Safety', 'Public Transit Hub', 'Low-Cost Tactical Urbanism'
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [streetFile, setStreetFile] = useState<File | null>(null);
  const [satelliteFile, setSatelliteFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ReShapeResult | null>(null);
  
  // State for generated images per level: { 50: url, 75: url, ... }
  const [levelImages, setLevelImages] = useState<Record<number, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoadingPreset, setIsLoadingPreset] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Replaces Slider: View Mode 'existing' (Level 0) or 'proposed' (Level 100)
  const [viewMode, setViewMode] = useState<'existing' | 'proposed'>('existing');
  
  // Interactive States
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>('General Planner');
  const [selectedFocus, setSelectedFocus] = useState<string>('General Improvement');
  const [selectedStyle, setSelectedStyle] = useState<RenderingStyle>('Photorealistic');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const streetFileUrl = useMemo(() => streetFile ? URL.createObjectURL(streetFile) : null, [streetFile]);

  useEffect(() => {
    return () => { if (streetFileUrl) URL.revokeObjectURL(streetFileUrl); };
  }, [streetFileUrl]);

  useEffect(() => {
    if (appState !== AppState.DASHBOARD) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [appState]);

  // Derived selectedLevelId based on View Mode
  const selectedLevelId = viewMode === 'proposed' ? 100 : 0;

  // Handle Image Generation when switching to Proposed (Backup / Lazy Load)
  useEffect(() => {
    const fetchAssets = async () => {
      if (!analysis || viewMode !== 'proposed') return; 
      
      const targetLevel = 100;
      // Add optional chaining here to prevent crash if prompts are missing
      const prompt = analysis.image_generation_prompts?.for_level_100;

      // 1. Generate Image if not cached
      if (!levelImages[targetLevel] && prompt) {
        setIsGeneratingImage(true);
        try {
          const url = await generateRedesignVisualization(prompt, streetFile, selectedStyle);
          setLevelImages(prev => ({ ...prev, [targetLevel]: url }));
        } catch (e) {
          console.error("Image gen error", e);
        } finally {
          setIsGeneratingImage(false);
        }
      }
    };

    fetchAssets();
  }, [viewMode, analysis, streetFile, selectedStyle, levelImages]);

  const handleAnalyze = async () => {
    if (!streetFile && !satelliteFile) return;
    setAppState(AppState.ANALYZING);
    try {
      // Pass selectedFocus as the goal
      const result = await analyzeUrbanImages(streetFile, satelliteFile, selectedPersona, selectedFocus);
      
      // Pre-generate the proposed image (Level 100) so it's ready immediately when dashboard loads
      let initialImages: Record<number, string> = {};
      
      // Add optional chaining here to prevent crash if prompts are missing
      const prompt = result.image_generation_prompts?.for_level_100;
      
      if (prompt && streetFile) {
        try {
          const url = await generateRedesignVisualization(prompt, streetFile, selectedStyle);
          initialImages[100] = url;
        } catch (imgErr) {
          console.error("Initial image generation failed:", imgErr);
          // We continue to dashboard even if image fails; the useEffect/UI will handle retry or error state
        }
      }

      setAnalysis(result);
      setViewMode('existing'); // Reset to existing view on new analysis
      setLevelImages(initialImages); // Set the pre-generated images
      setAppState(AppState.DASHBOARD);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unexpected error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  const loadExample = async (type: 'busy' | 'residential' | 'highway') => {
    if (isLoadingPreset) return;
    setIsLoadingPreset(type);
    
    const config = {
      busy: {
        url: "https://images.unsplash.com/photo-1542361345-89e58247f2d5?auto=format&fit=crop&q=80&w=800",
        satUrl: null,
        name: 'demo_city_center.jpg',
        satName: null,
        persona: 'Cyclist' as UserPersona,
        focus: 'Pedestrian & Bike Friendly'
      },
      residential: {
        url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=800",
        satUrl: null,
        name: 'demo_residential.jpg',
        satName: null,
        persona: 'Parent with Stroller' as UserPersona,
        focus: 'Maximize Greenery'
      },
      highway: {
        // Updated to a busy, chaotic street view similar to Indian main roads
        url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800&auto=format&fit=crop", 
        // Updated to a generic urban satellite view
        satUrl: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=800&auto=format&fit=crop", 
        name: 'demo_main_road.jpg',
        satName: 'demo_satellite_map.jpg',
        persona: 'General Planner' as UserPersona,
        focus: 'Public Transit Hub'
      }
    };

    const target = config[type];

    try {
      // Load Street Image
      const response = await fetch(target.url, { mode: 'cors' });
      const blob = await response.blob();
      const file = new File([blob], target.name, { type: blob.type });
      setStreetFile(file);

      // Load Satellite Image if available
      if (target.satUrl) {
        const satRes = await fetch(target.satUrl, { mode: 'cors' });
        const satBlob = await satRes.blob();
        const satFile = new File([satBlob], target.satName!, { type: satBlob.type });
        setSatelliteFile(satFile);
      } else {
        setSatelliteFile(null);
      }

      setSelectedPersona(target.persona);
      setSelectedFocus(target.focus);
    } catch (error) {
      console.error("Failed to load example", error);
      alert("Could not load demo image. It might be blocked by browser security. Please try uploading your own image.");
    } finally {
      setIsLoadingPreset(null);
    }
  };

  const toggleSpeech = () => {
    if (!analysis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const script = analysis.audio_tour_script.script;
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.onend = () => setIsSpeaking(false);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setAnalysis(null);
    setStreetFile(null);
    setSatelliteFile(null);
    setViewMode('existing');
    setLevelImages({});
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const currentLevel = analysis?.redesign_levels.levels.find(l => l.id === selectedLevelId) || analysis?.redesign_levels.levels[0];
  
  // Logic update: Do NOT fallback to streetFileUrl if we are in proposed mode (level 100).
  // If image is missing in proposed mode, activeImage is undefined, triggering the loader UI.
  const activeImage = selectedLevelId === 0 ? streetFileUrl : levelImages[selectedLevelId];
  
  const getMetricDelta = (key: keyof typeof currentLevel.metric_deltas) => {
    return currentLevel?.metric_deltas[key] || 0;
  };

  // --- UPLOAD SCREEN (SPLIT LAYOUT) ---
  if (appState === AppState.UPLOAD || appState === AppState.ERROR) {
    return (
      <div className="min-h-screen bg-brand-dark lg:grid lg:grid-cols-[1fr_2fr] overflow-hidden">
        
        {/* Left Panel: Branding & Hero */}
        <div className="relative p-12 flex flex-col justify-center items-start space-y-8 bg-brand-dark overflow-hidden border-b lg:border-b-0 lg:border-r border-brand-surface/30 min-h-[40vh] lg:min-h-screen">
           {/* Background decorative elements */}
           <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-panel/30 rounded-full blur-[100px] pointer-events-none"></div>
           <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-accent/5 rounded-full blur-[80px] pointer-events-none"></div>

           <div className="z-10 space-y-6 w-full max-w-xs">
             {/* Logo Container */}
             <div className="w-24 h-24 bg-brand-panel rounded-2xl flex items-center justify-center border border-brand-surface shadow-2xl shadow-brand-dark/50 overflow-hidden p-2">
                <Logo className="w-full h-full text-brand-text" />
             </div>
             
             <div className="space-y-2">
               <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-text tracking-tight leading-tight">
                 ReShape City <span className="text-brand-accent">AI</span>
               </h1>
               <p className="text-brand-muted text-lg lg:text-xl font-light leading-relaxed">
                 Simulate the future of your city.
               </p>
             </div>

             <div className="space-y-4 pt-6 border-t border-brand-surface/30 w-full">
               <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Try a preset</p>
               <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => loadExample('busy')}
                   disabled={!!isLoadingPreset}
                   className={`flex flex-col items-center justify-center p-3 bg-brand-panel hover:bg-brand-surface border border-brand-surface rounded-xl transition-all group ${isLoadingPreset === 'busy' ? 'opacity-75 cursor-wait' : ''}`}
                 >
                    {isLoadingPreset === 'busy' ? (
                      <Loader2 className="w-8 h-8 mb-2 text-brand-accent animate-spin" />
                    ) : (
                      <div className="w-8 h-8 bg-brand-dark rounded-full flex items-center justify-center mb-2 text-brand-accent group-hover:scale-110 transition-transform shadow-lg">
                        <Building2 size={16} />
                      </div>
                    )}
                    <span className="text-xs font-bold text-brand-text">City Center</span>
                 </button>
                 
                 <button 
                   onClick={() => loadExample('residential')}
                   disabled={!!isLoadingPreset}
                   className={`flex flex-col items-center justify-center p-3 bg-brand-panel hover:bg-brand-surface border border-brand-surface rounded-xl transition-all group ${isLoadingPreset === 'residential' ? 'opacity-75 cursor-wait' : ''}`}
                 >
                    {isLoadingPreset === 'residential' ? (
                      <Loader2 className="w-8 h-8 mb-2 text-brand-green animate-spin" />
                    ) : (
                      <div className="w-8 h-8 bg-brand-dark rounded-full flex items-center justify-center mb-2 text-brand-green group-hover:scale-110 transition-transform shadow-lg">
                        <TreeDeciduous size={16} /> 
                      </div>
                    )}
                    <span className="text-xs font-bold text-brand-text">Neighborhood</span>
                 </button>

                 <button 
                   onClick={() => loadExample('highway')}
                   disabled={!!isLoadingPreset}
                   className={`flex flex-col items-center justify-center p-3 bg-brand-panel hover:bg-brand-surface border border-brand-surface rounded-xl transition-all group ${isLoadingPreset === 'highway' ? 'opacity-75 cursor-wait' : ''}`}
                 >
                    {isLoadingPreset === 'highway' ? (
                      <Loader2 className="w-8 h-8 mb-2 text-brand-blossom animate-spin" />
                    ) : (
                      <div className="w-8 h-8 bg-brand-dark rounded-full flex items-center justify-center mb-2 text-brand-blossom group-hover:scale-110 transition-transform shadow-lg">
                        <Car size={16} /> 
                      </div>
                    )}
                    <span className="text-xs font-bold text-brand-text">Main Road</span>
                 </button>
               </div>
               
               <div className="flex gap-3 justify-center pt-2 opacity-50">
                  <span className="text-[10px] text-brand-muted">Powered by Gemini 2.5 & Veo</span>
               </div>
             </div>
           </div>
        </div>

        {/* Right Panel: Upload & Interaction */}
        <div className="relative p-6 lg:p-12 flex flex-col justify-center overflow-y-auto h-full bg-brand-dark lg:h-screen">
           <div className="max-w-4xl w-full mx-auto space-y-6 lg:mt-0 pt-12 lg:pt-0">
             
             <div>
               <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <ImageUpload label="Street Level View" subLabel="Required" icon="street" selectedFile={streetFile} onFileSelect={setStreetFile} />
                  <ImageUpload label="Satellite / Map View" subLabel="Optional" icon="map" selectedFile={satelliteFile} onFileSelect={setSatelliteFile} />
               </div>

               <div className="bg-brand-panel border border-brand-surface rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl shadow-black/20">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text tracking-wide uppercase">Persona</label>
                    <select 
                      value={selectedPersona} onChange={(e) => setSelectedPersona(e.target.value as UserPersona)}
                      className="w-full bg-brand-dark border border-brand-surface rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all"
                    >
                      {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text tracking-wide uppercase">Style</label>
                    <select 
                      value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value as RenderingStyle)}
                      className="w-full bg-brand-dark border border-brand-surface rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all"
                    >
                      {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text tracking-wide uppercase">Focus</label>
                    <select 
                      value={selectedFocus} 
                      onChange={(e) => setSelectedFocus(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-surface rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all"
                    >
                       {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
               </div>

               {appState === AppState.ERROR && (
                  <div className="mt-4 bg-brand-panel border border-red-500/50 text-brand-text p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5"/> 
                      <div className="space-y-2 w-full">
                        <p className="font-bold text-red-100">{errorMsg.replace("VALIDATION_FAILED: ", "")}</p>
                        
                        {errorMsg.includes("VALIDATION_FAILED") && (
                           <div className="bg-brand-dark/50 p-3 rounded-lg border border-brand-surface/50 mt-2">
                              <p className="text-[10px] text-brand-muted uppercase font-bold mb-2 tracking-wider">Expected Input Format</p>
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1 group cursor-help">
                                    <div className="relative rounded-lg overflow-hidden border border-brand-surface/60 group-hover:border-brand-accent/50 transition-colors">
                                      <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=400&q=80" className="w-full h-20 object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Example Street" />
                                      <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 font-bold backdrop-blur-sm rounded-tr">STREET</div>
                                    </div>
                                    <p className="text-[9px] text-brand-muted">Eye-level view of road/buildings</p>
                                 </div>
                                 <div className="space-y-1 group cursor-help">
                                    <div className="relative rounded-lg overflow-hidden border border-brand-surface/60 group-hover:border-brand-green/50 transition-colors">
                                      <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400" className="w-full h-20 object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Example Satellite" />
                                       <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 font-bold backdrop-blur-sm rounded-tr">SATELLITE</div>
                                    </div>
                                    <p className="text-[9px] text-brand-muted">Top-down map or aerial view</p>
                                 </div>
                              </div>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

               <div className="flex justify-center pt-6">
                  <button
                    onClick={handleAnalyze}
                    disabled={!streetFile}
                    className="px-8 py-4 bg-brand-accent hover:bg-brand-accent-hover rounded-xl font-bold text-brand-dark text-lg transition-all shadow-lg shadow-brand-accent/20 w-full transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send size={20} /> Generate Inclusive Plan
                  </button>
               </div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (appState === AppState.ANALYZING) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-16 h-16 text-brand-accent animate-spin" />
        <h2 className="text-2xl font-bold text-brand-text">Analyzing Urban Context...</h2>
        <p className="text-brand-muted">Evaluating walkability, climate stress, and redesign potential.</p>
        <p className="text-xs text-brand-muted/70 pt-2">Generating visualization preview...</p>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col" id="dashboard-container">
      {/* Header */}
      <header className="h-16 border-b border-brand-surface bg-brand-panel flex items-center justify-between px-6 sticky top-0 z-50 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand-dark p-1.5 rounded-lg border border-brand-surface h-10 w-10 overflow-hidden">
             <Logo className="w-full h-full text-brand-text" />
          </div>
          <span className="font-extrabold text-xl text-brand-text tracking-tight">ReShape City <span className="text-brand-accent">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleSpeech} className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-brand-accent text-brand-dark animate-pulse' : 'bg-brand-dark border border-brand-surface text-brand-text hover:bg-brand-surface'}`}>
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="h-6 w-px bg-brand-surface mx-1"></div>
          <button onClick={resetApp} className="px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-brand-dark text-xs font-bold rounded-lg flex items-center gap-1 transition-colors">
            <RefreshCw size={12} /> NEW PROJECT
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left: Configuration & Baseline */}
        <div className="lg:col-span-3 border-r border-brand-surface bg-brand-panel p-5 space-y-6 order-2 lg:order-1">
          
          {/* Analysis Configuration */}
          <section className="bg-brand-dark/50 p-4 rounded-xl border border-brand-surface shadow-sm">
            <h3 className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sliders size={12} /> Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase">Persona</label>
                <select 
                  value={selectedPersona} onChange={(e) => setSelectedPersona(e.target.value as UserPersona)}
                  className="w-full bg-brand-panel border border-brand-surface rounded px-2 py-1.5 text-xs text-brand-text outline-none focus:border-brand-accent mt-1"
                >
                  {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase">Focus</label>
                <select 
                  value={selectedFocus} onChange={(e) => setSelectedFocus(e.target.value)}
                  className="w-full bg-brand-panel border border-brand-surface rounded px-2 py-1.5 text-xs text-brand-text outline-none focus:border-brand-accent mt-1"
                >
                  {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
               <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase">Style</label>
                <select 
                  value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value as RenderingStyle)}
                  className="w-full bg-brand-panel border border-brand-surface rounded px-2 py-1.5 text-xs text-brand-text outline-none focus:border-brand-accent mt-1"
                >
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAnalyze}
                className="w-full bg-brand-surface hover:bg-brand-accent hover:text-brand-dark text-brand-text text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <RefreshCw size={12} /> Update Simulation
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Ruler size={12} /> Baseline Analysis
            </h3>
            
            {/* New Spatial Data Display */}
            {analysis?.baseline_analysis.spatial_metrics && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/50 p-2 rounded border border-brand-surface text-center">
                  <span className="block text-[10px] text-brand-muted uppercase">Width</span>
                  <span className="text-sm font-bold text-brand-accent">{analysis.baseline_analysis.spatial_metrics.estimated_street_width_m}m</span>
                </div>
                <div className="bg-brand-dark/50 p-2 rounded border border-brand-surface text-center">
                  <span className="block text-[10px] text-brand-muted uppercase">Lanes</span>
                  <span className="text-sm font-bold text-brand-text">{analysis.baseline_analysis.spatial_metrics.existing_lanes}</span>
                </div>
                <div className="bg-brand-dark/50 p-2 rounded border border-brand-surface text-center">
                  <span className="block text-[10px] text-brand-muted uppercase">Sidewalk</span>
                  <span className="text-sm font-bold text-brand-text">{analysis.baseline_analysis.spatial_metrics.sidewalk_width_m}m</span>
                </div>
              </div>
            )}

            <p className="text-sm text-brand-text mb-4 leading-relaxed">{analysis?.baseline_analysis.visual_summary}</p>
            <div className="space-y-2">
               {analysis?.baseline_analysis.key_problems.map((p, i) => (
                 <div key={i} className="flex gap-2 items-start text-xs text-brand-text bg-brand-dark/50 p-2.5 rounded border border-brand-surface">
                   <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-brand-accent" /> {p}
                 </div>
               ))}
            </div>
          </section>
        </div>

        {/* Center: Viz & Strategy (Split View implemented here) */}
        <div className="lg:col-span-6 bg-brand-dark flex flex-col order-1 lg:order-2 border-b lg:border-b-0 border-brand-surface relative z-10">
          
          {/* View Toggle */}
          <div className="h-14 flex items-center justify-center border-b border-brand-surface bg-brand-panel/30">
            <div className="flex bg-brand-dark rounded-lg p-1 border border-brand-surface">
              <button 
                onClick={() => setViewMode('existing')}
                className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'existing' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
              >
                EXISTING
              </button>
              <button 
                onClick={() => setViewMode('proposed')}
                className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'proposed' ? 'bg-brand-accent text-brand-dark shadow-sm' : 'text-brand-muted hover:text-brand-text'}`}
              >
                PROPOSED
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="relative overflow-hidden flex items-center justify-center p-6 bg-brand-dark w-full shrink-0 h-[50vh] lg:h-[65vh]">
             
             {/* Existing Mode: Single Image */}
             {viewMode === 'existing' && (
               <div className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl shadow-black/30 border border-brand-surface">
                 <img src={streetFileUrl || ''} className="w-full h-full object-contain bg-brand-panel" alt="Original Street View" />
               </div>
             )}

             {/* Proposed Mode: Single Image (Video removed) */}
             {viewMode === 'proposed' && (
               <div className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl shadow-black/30 border border-brand-surface bg-brand-panel group">
                  <div className="absolute top-2 left-2 bg-brand-dark/80 text-brand-accent text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md z-10 border border-brand-surface">REDESIGN</div>
                  {activeImage ? (
                    <img src={activeImage} className="w-full h-full object-cover" alt="Redesign" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <div className="text-center">
                         <Loader2 className="w-8 h-8 text-brand-accent animate-spin mx-auto mb-2" />
                         <p className="text-xs text-brand-muted">Generating Concept...</p>
                       </div>
                    </div>
                  )}
               </div>
             )}
          </div>

          {/* Strategy Card */}
          {viewMode === 'proposed' && (
            <div className="bg-brand-panel border-t border-brand-surface p-6 z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-5 duration-300">
               <div className="flex items-center gap-2 mb-3">
                 <div className="bg-brand-accent/20 p-1.5 rounded text-brand-accent"><Send size={16} /></div>
                 <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">Proposed Strategy</h3>
               </div>
               <p className="text-sm text-brand-text italic leading-relaxed mb-4 border-l-2 border-brand-accent pl-3">
                 "{currentLevel?.description}"
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 {currentLevel?.interventions.map((item, i) => (
                   <div key={i} className="flex items-start gap-2 text-xs bg-brand-dark/50 text-brand-text px-3 py-2 rounded border border-brand-surface/50">
                      <span className="text-brand-green font-bold mt-0.5">✓</span> {item}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Right: Metrics & Impact */}
        <div className="lg:col-span-3 border-l border-brand-surface bg-brand-panel p-5 space-y-6 order-3 lg:order-3">
           <section>
             <h3 className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-3 flex items-center gap-2">
               <TrendingUp size={14} /> Performance Metrics
             </h3>
             <div className="space-y-3">
               {analysis && (
                 <>
                   <IndexMetric label="Walkability" baseline={analysis.baseline_analysis.baseline_metrics.walkability_index} delta={getMetricDelta('walkability_index')} />
                   <IndexMetric label="Green Cover" baseline={analysis.baseline_analysis.baseline_metrics.green_cover_index} delta={getMetricDelta('green_cover_index')} />
                   <IndexMetric label="Traffic Stress" baseline={analysis.baseline_analysis.baseline_metrics.traffic_stress_index} delta={getMetricDelta('traffic_stress_index')} reverseColor />
                 </>
               )}
             </div>
           </section>

           {/* Budget Card */}
           {analysis && (
             <section>
               <BudgetCard costData={analysis.cost_and_feasibility} selectedLevelId={selectedLevelId} />
             </section>
           )}

           <section>
             <h3 className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-3 flex items-center gap-2">
               <Thermometer size={14} /> Climate Stress Test
             </h3>
             <div className="space-y-3">
               {analysis?.climate_stress_test.scenarios.map((s, i) => (
                 <div key={i} className="bg-brand-dark/50 p-3 rounded border border-brand-surface hover:border-brand-accent/30 transition-colors">
                    <span className="text-xs font-bold text-brand-text uppercase block mb-1">{(s.type || 'Scenario').replace(/_/g, ' ')}</span>
                    <p className="text-xs text-brand-muted mb-2">" {s.redesigned_behaviour} "</p>
                    <div className="flex flex-wrap gap-1">
                      {s.key_measures.map((m, j) => <span key={j} className="text-[10px] bg-brand-surface px-1.5 py-0.5 rounded text-brand-text border border-brand-panel">{m}</span>)}
                    </div>
                 </div>
               ))}
             </div>
           </section>
        </div>
      </main>

      <ChatAssistant analysis={analysis} />
    </div>
  );
};

export default App;