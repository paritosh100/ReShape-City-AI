import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  ArrowRight, 
  Map as MapIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  Layout,
  Eye,
  Wand2,
  Users,
  Leaf,
  Volume2,
  VolumeX,
  Sliders,
  Palette,
  Download
} from 'lucide-react';

import ImageUpload from './components/ImageUpload';
import { ComparisonCard, BenefitList } from './components/MetricCard';
import { SolarCard } from './components/BudgetCard';
import ChatAssistant from './components/ChatAssistant';
import { analyzeUrbanImages, generateRedesignVisualization } from './services/geminiService';
import { AnalysisResult, AppState, UserPersona, DesignFocus, RenderingStyle } from './types';

// Global declaration for html2canvas and jspdf
declare const html2canvas: any;
declare const jspdf: any;

const PERSONAS: UserPersona[] = [
  'General Planner', 
  'Wheelchair User', 
  'Cyclist', 
  'Parent with Stroller', 
  'Small Business Owner',
  'Elderly Resident'
];

const FOCUS_AREAS: DesignFocus[] = [
  'Balanced',
  'Max Greenery',
  'Pedestrian Only',
  'Night Economy',
  'Public Transit',
  'Low Cost / Tactical'
];

const STYLES: RenderingStyle[] = [
  'Photorealistic',
  'Watercolor Sketch',
  'Blueprint/Schematic',
  'Futuristic'
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [streetFile, setStreetFile] = useState<File | null>(null);
  const [satelliteFile, setSatelliteFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [viewMode, setViewMode] = useState<'before' | 'after'>('before');
  
  // Interactive States
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>('General Planner');
  const [selectedFocus, setSelectedFocus] = useState<DesignFocus>('Balanced');
  const [selectedStyle, setSelectedStyle] = useState<RenderingStyle>('Photorealistic');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Memoize the object URL to avoid flickering and re-creation on renders
  const streetFileUrl = useMemo(() => {
    return streetFile ? URL.createObjectURL(streetFile) : null;
  }, [streetFile]);

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (streetFileUrl) URL.revokeObjectURL(streetFileUrl);
    };
  }, [streetFileUrl]);

  // Stop speech if we leave the dashboard
  useEffect(() => {
    if (appState !== AppState.DASHBOARD) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [appState]);

  const handleAnalyze = async () => {
    if (!streetFile && !satelliteFile) return;

    setAppState(AppState.ANALYZING);
    try {
      // 1. Analyze text/data with persona and focus
      const result = await analyzeUrbanImages(streetFile, satelliteFile, selectedPersona, selectedFocus);
      setAnalysis(result);

      // 2. Generate Image
      setAppState(AppState.GENERATING_IMAGE);
      const imageUrl = await generateRedesignVisualization(result.imageGenerationPrompt, streetFile, selectedStyle);
      setGeneratedImage(imageUrl);

      // 3. Switch to dashboard and show the result
      setViewMode('after');
      setAppState(AppState.DASHBOARD);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unexpected error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  const toggleSpeech = () => {
    if (!analysis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `
      Analysis for ${selectedPersona} perspective.
      Existing conditions: ${analysis.beforeAnalysis.streetLevel.join('. ')}.
      Identified problems: ${analysis.identifiedProblems.join('. ')}.
      Proposed Concept: ${analysis.redesignPlan.concept}.
      Interventions: ${analysis.redesignPlan.interventions.join('. ')}.
    `;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.onend = () => setIsSpeaking(false);
    utterance.rate = 1.0;
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-container');
    if (!element || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      alert("PDF libraries not loaded yet.");
      return;
    }

    try {
      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`urban-plan-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF.");
    }
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setAnalysis(null);
    setGeneratedImage(null);
    setStreetFile(null);
    setSatelliteFile(null);
    setViewMode('before');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  if (appState === AppState.UPLOAD || appState === AppState.ERROR) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        {/* Background ambient effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl w-full z-10 space-y-8 my-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-blue-500/20 rounded-2xl mb-4 border border-blue-500/30">
              <Building2 className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Urban Planner AI
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Transform urban environments. Design for <span className="text-blue-400 font-semibold">inclusivity</span> and <span className="text-green-400 font-semibold">sustainability</span> using multimodal AI analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ImageUpload 
              label="Street Level View" 
              subLabel="Upload a photo from the ground" 
              icon="street"
              selectedFile={streetFile}
              onFileSelect={setStreetFile}
            />
            <ImageUpload 
              label="Satellite / Map View" 
              subLabel="Upload a top-down aerial shot" 
              icon="map"
              selectedFile={satelliteFile}
              onFileSelect={setSatelliteFile}
            />
          </div>

          {/* Project Configuration */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Users size={16} className="text-blue-400"/> Community Perspective
              </label>
              <select 
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value as UserPersona)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Leaf size={16} className="text-green-400"/> Design Focus
              </label>
              <select 
                value={selectedFocus}
                onChange={(e) => setSelectedFocus(e.target.value as DesignFocus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              >
                {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

             <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Palette size={16} className="text-purple-400"/> Rendering Style
              </label>
              <select 
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as RenderingStyle)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              >
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {appState === AppState.ERROR && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle size={20} />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={handleAnalyze}
              disabled={!streetFile && !satelliteFile}
              className={`
                group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-white text-lg transition-all shadow-lg shadow-blue-900/20
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 w-full md:w-auto
              `}
            >
              <span className="flex items-center justify-center gap-3">
                Generate Inclusive Plan <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === AppState.ANALYZING || appState === AppState.GENERATING_IMAGE) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {appState === AppState.ANALYZING 
              ? `Analyzing for ${selectedPersona}...` 
              : `Designing in ${selectedStyle} style...`}
          </h2>
          <p className="text-slate-400">
            {appState === AppState.ANALYZING 
              ? "Identifying barriers, calculating area, and checking solar exposure." 
              : "Rendering visualization with pedestrian-first interventions."}
          </p>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen lg:h-screen bg-slate-950 flex flex-col lg:overflow-hidden" id="dashboard-container">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-1.5 rounded-lg">
            <Building2 className="text-blue-500" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-tight">Urban Planner AI</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              AI Powered City Design
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
            onClick={toggleSpeech}
            title="Read Analysis Aloud"
            className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          
          <button 
            onClick={exportPDF}
            title="Export Report to PDF"
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <Download size={18} />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1"></div>
          
          <button 
            onClick={resetApp}
            className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} /> New Project
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:overflow-hidden h-full">
        
        {/* Left Panel: Analysis & Problems */}
        <div className="lg:col-span-3 border-r border-slate-800 bg-slate-900/30 lg:overflow-y-auto p-6 space-y-8 order-2 lg:order-1 h-auto lg:h-full scrollbar-thin">
          
          {/* Analysis Settings (Re-run) */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sliders size={14} /> Analysis Settings
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                 <select 
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona(e.target.value as UserPersona)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select 
                  value={selectedFocus}
                  onChange={(e) => setSelectedFocus(e.target.value as DesignFocus)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200 focus:ring-1 focus:ring-green-500 outline-none"
                >
                  {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                 <select 
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as RenderingStyle)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
                >
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAnalyze} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
              >
                <RefreshCw size={12} /> Regenerate Analysis
              </button>
            </div>
          </div>

          <section>
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapIcon size={14} /> Existing Conditions
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Street Level Analysis</h4>
                <ul className="space-y-2">
                  {analysis?.beforeAnalysis.streetLevel.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-slate-700">{item}</li>
                  ))}
                </ul>
              </div>
              {analysis?.beforeAnalysis.satellite && analysis.beforeAnalysis.satellite.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase mt-4">Satellite Analysis</h4>
                  <ul className="space-y-2">
                    {analysis.beforeAnalysis.satellite.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-slate-700">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Identified Problems
            </h3>
             <p className="text-xs text-slate-500 mb-3">Prioritized for: <span className="text-amber-400">{selectedPersona}</span></p>
            <div className="space-y-2">
              {analysis?.identifiedProblems.map((problem, i) => (
                <div key={i} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-sm text-amber-100">
                  {problem}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} /> Redesign Strategy
            </h3>
            <p className="text-sm text-slate-300 italic mb-4">"{analysis?.redesignPlan.concept}"</p>
            <ul className="space-y-2">
              {analysis?.redesignPlan.interventions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Center Panel: Visualization */}
        <div className="lg:col-span-6 bg-slate-950 relative flex flex-col order-1 lg:order-2 h-[60vh] lg:h-full border-b lg:border-b-0 border-slate-800 lg:overflow-hidden">
          
          {/* Tabs */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/80 backdrop-blur-md rounded-full p-1 border border-slate-700 flex gap-1 shadow-xl">
            <button 
              onClick={() => setViewMode('before')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all ${viewMode === 'before' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Eye size={14} /> Existing
            </button>
            <button 
              onClick={() => setViewMode('after')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all ${viewMode === 'after' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Wand2 size={14} /> Proposed
            </button>
          </div>

          <div className="flex-1 w-full h-full relative p-4 flex items-center justify-center overflow-hidden">
            {viewMode === 'before' && streetFileUrl && (
              <>
                <div className="absolute top-6 left-6 z-20 bg-black/60 px-3 py-1 rounded-md text-xs font-bold text-slate-300 uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                  Existing Conditions
                </div>
                <img 
                  src={streetFileUrl} 
                  className="w-full h-full object-contain" 
                  alt="Original Street" 
                />
              </>
            )}

            {viewMode === 'after' && generatedImage && (
              <>
                <div className="absolute top-6 right-6 z-20 bg-blue-600/80 px-3 py-1 rounded-md text-xs font-bold text-white uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                  {selectedFocus} Redesign
                </div>
                <div className="absolute bottom-6 right-6 z-20 bg-purple-600/80 px-3 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                  Style: {selectedStyle}
                </div>
                <img 
                  src={generatedImage} 
                  className="w-full h-full object-contain" 
                  alt="Redesigned Street" 
                />
              </>
            )}
            
            {/* Empty State / Loading placeholder fallback */}
            {viewMode === 'after' && !generatedImage && (
               <div className="text-slate-500 flex flex-col items-center gap-3">
                 <Loader2 className="animate-spin" />
                 <span className="text-sm">Rendering visualization...</span>
               </div>
            )}
          </div>
        </div>

        {/* Right Panel: Metrics Dashboard */}
        <div className="lg:col-span-3 border-l border-slate-800 bg-slate-900/30 lg:overflow-y-auto p-6 order-3 lg:h-full scrollbar-thin">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Layout size={14} /> Planning Metrics
          </h3>

          <div className="space-y-6">
            {analysis && (
              <>
                <SolarCard solar={analysis.metrics.solar} />

                <ComparisonCard 
                  title="Floor Area Efficiency" 
                  metric={analysis.metrics.floorArea}
                  color="#60a5fa" 
                />
                
                <ComparisonCard 
                  title="Public Open Space" 
                  metric={analysis.metrics.openSpace}
                  color="#34d399" 
                />

                <div className="bg-slate-900 rounded-lg p-5 border border-slate-800">
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Projected Benefits</h4>
                  <BenefitList benefits={analysis.metrics.benefits} />
                </div>
              </>
            )}
          </div>
        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatAssistant analysis={analysis} />
    </div>
  );
};

export default App;