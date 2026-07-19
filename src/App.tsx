import { useState } from "react";
import { useSimulation } from "./hooks/useSimulation.js";
import { simulationStore } from "./utils/simulationStore.js";

// Import components
import MultilingualAssistant from "./components/MultilingualAssistant.js";
import SmartNavigation from "./components/SmartNavigation.js";
import AccessibilityAssistant from "./components/AccessibilityAssistant.js";
import TransportStatus from "./components/TransportStatus.js";

import CrowdHeatmap from "./components/CrowdHeatmap.js";
import IncidentQueue from "./components/IncidentQueue.js";
import SustainabilityDashboard from "./components/SustainabilityDashboard.js";
import VolunteerTaskBoard from "./components/VolunteerTaskBoard.js";
import DigestReport from "./components/DigestReport.js";

import { Globe, Shield, RefreshCw, Sparkles, Navigation, Users, AlertTriangle, Play } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"fan" | "ops">("fan");
  const simulationState = useSimulation();
  const [isTicking, setIsTicking] = useState(false);

  // Manual trigger to advance simulation tick instantly
  const handleTriggerTick = async () => {
    setIsTicking(true);
    try {
      const res = await fetch("/api/simulation/tick", { method: "POST" });
      if (res.ok) {
        await simulationStore.fetchState();
      }
    } catch (e) {
      console.error("Failed to advance simulation tick", e);
    } finally {
      setIsTicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans selection:bg-green-100 selection:text-green-800">
      {/* Dynamic Header Banner */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-green-600 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-green-100 ring-2 ring-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-gray-900 text-lg tracking-tight font-sans">StadiumIQ</h1>
                <span className="bg-green-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  FIFA 2026
                </span>
              </div>
              <p className="text-xs text-gray-500">Autonomous Operations & Fan Experience Core</p>
            </div>
          </div>

          {/* Interactive Controllers & Manual Simulator Tick */}
          <div className="flex flex-wrap items-center gap-3.5">
            {simulationState && (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-3.5 py-1.5 rounded-xl text-[10px] font-semibold text-gray-500">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Last Synced: <strong>{new Date(simulationState.lastUpdated).toLocaleTimeString()}</strong></span>
              </div>
            )}

            <button
              onClick={handleTriggerTick}
              disabled={isTicking}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 active:bg-gray-50 text-gray-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 min-h-[38px]"
              aria-label="Advance stadium event tick"
            >
              <Play className={`h-3.5 w-3.5 text-green-600 ${isTicking ? "animate-spin" : ""}`} />
              <span>Step Simulator</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Unified Connective Idea Intro Banner */}
        <div className="bg-gradient-to-r from-green-800 to-emerald-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-green-950/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent)] pointer-events-none" />
          <div className="relative max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-700/50 border border-green-600/40 text-green-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              Unified Intelligence Architecture
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              One Connective Stadium Neural System
            </h2>
            <p className="text-xs md:text-sm text-green-100/90 leading-relaxed font-sans">
              StadiumIQ is not 8 disconnected pages. It is a single, closed-loop AI Decision Engine. Simulated real-time sensors (crowd occupancy, carbon draws, incident tickets) flow into the core brain. It immediately classifies priorities, routing advice out to fan-facing maps, accessibility assistants, and volunteer task boards simultaneously.
            </p>
          </div>
        </div>

        {/* Dynamic Portal Navigation Selector (Touch-friendly size >=44px) */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm max-w-md w-full mx-auto">
          <button
            onClick={() => setActiveTab("fan")}
            className={`flex-1 py-3 text-center text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === "fan"
                ? "bg-green-600 text-white shadow-md shadow-green-100"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-selected={activeTab === "fan"}
            role="tab"
          >
            <Globe className="h-4.5 w-4.5" />
            Spectator Portal
          </button>
          <button
            onClick={() => setActiveTab("ops")}
            className={`flex-1 py-3 text-center text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === "ops"
                ? "bg-green-600 text-white shadow-md shadow-green-100"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-selected={activeTab === "ops"}
            role="tab"
          >
            <Users className="h-4.5 w-4.5" />
            Operations Command
          </button>
        </div>

        {/* Tab Viewports */}
        <div className="space-y-8">
          {activeTab === "fan" ? (
            <div className="space-y-8 animate-fade-in">
              {/* Row 1: Chat Assistant & Wayfinding Map */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <MultilingualAssistant />
                <SmartNavigation />
              </div>

              {/* Row 2: Accessibility & Transit Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AccessibilityAssistant />
                <TransportStatus />
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Row 1: Heatmap Density Log */}
              <div className="grid grid-cols-1 gap-8">
                <CrowdHeatmap />
              </div>

              {/* Row 2: Incident Reporting & Operations Queue */}
              <IncidentQueue />

              {/* Row 3: Sustainability Dashboard & Volunteers */}
              <SustainabilityDashboard />

              {/* Row 4: Volunteer Kanban Board */}
              <VolunteerTaskBoard />

              {/* Row 5: AI Operations Digest Briefing */}
              <DigestReport />
            </div>
          )}
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-[10px] text-gray-400 font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            <strong>StadiumIQ FIFA World Cup 2026 operations simulator.</strong> Real-time feeds represent simulated telemetry generated in-memory.
          </p>
          <p>
            Developed using Google Gemini Pro AI & Node.js. Optimized for accessibility, keyboard navigation, and full-screen diagnostics.
          </p>
        </div>
      </footer>
    </div>
  );
}
