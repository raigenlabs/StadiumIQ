import { useMemo } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { StadiumZone } from "../types.js";
import { Trash2, Zap, HelpCircle, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * Sustainability and Energy Efficiency Dashboard component. Satisfies the "sustainability" capability.
 */
export default function SustainabilityDashboard() {
  const simulationState = useSimulation();
  const metrics = simulationState?.metrics || [];

  // Sort zones by waste levels to track potential overflows
  const wasteLeveledZones = useMemo(() => {
    return [...metrics].sort((a, b) => b.wasteFillLevel - a.wasteFillLevel);
  }, [metrics]);

  // Total energy usage aggregator
  const totalPowerDraw = useMemo(() => {
    return metrics.reduce((acc, m) => acc + m.energyUsageKw, 0);
  }, [metrics]);

  // Dynamic AI Recommendation engine based on live data
  const aiRecommendations = useMemo(() => {
    const list: string[] = [];

    metrics.forEach((m) => {
      // Waste triggers
      if (m.wasteFillLevel >= 80) {
        list.push(
          `ALERT: ${m.zone.split(" (")[0]} waste bins are at ${m.wasteFillLevel}% capacity. Dispatch nearby volunteers to clear bins immediately.`
        );
      } else if (m.wasteFillLevel >= 65) {
        list.push(
          `SCHEDULE: Schedule routine waste disposal truck route to clear ${m.zone.split(" (")[0]} within next 20 mins.`
        );
      }

      // Energy triggers
      if (m.energyUsageKw > 550) {
        list.push(
          `POWER AUDIT: ${m.zone.split(" (")[0]} energy draw is high (${m.energyUsageKw} kW). Recommend dimming secondary scoreboard signage by 15% during intermission.`
        );
      }
    });

    // Default recommendation if everything is perfect
    if (list.length === 0) {
      list.push("SYSTEM STATUS GREEN: Energy draw and sanitation indexes are balanced stadium-wide. Maintain standard matchday profile.");
    }

    return list;
  }, [metrics]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Waste Bin Fill Levels Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Sanitation & Trash Feeds</h3>
            </div>
            <p className="text-xs text-gray-500">Trash receptacle capacity levels by sector</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">
            <span>Simulated</span>
          </div>
        </div>

        <div className="space-y-4">
          {wasteLeveledZones.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">Calibrating bin levels...</div>
          ) : (
            wasteLeveledZones.map((m) => {
              const isOverLimit = m.wasteFillLevel >= 80;
              return (
                <div key={m.zone} className="text-xs space-y-1">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-bold">{m.zone.split(" (")[0]}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      isOverLimit ? "bg-red-100 text-red-800" : m.wasteFillLevel > 55 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                    }`}>
                      {m.wasteFillLevel}% Full
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isOverLimit ? "bg-red-500" : m.wasteFillLevel > 55 ? "bg-yellow-400" : "bg-green-500"
                      }`}
                      style={{ width: `${m.wasteFillLevel}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Energy Grid Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Electricity Grid Draw</h3>
            </div>
            <p className="text-xs text-gray-500">Power draw diagnostics per sector</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">
            <span>Simulated</span>
          </div>
        </div>

        {/* Aggregated Total Dial */}
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Stadium Power Load</span>
            <span className="block text-xl font-extrabold text-gray-800 mt-1">{totalPowerDraw.toLocaleString()} kW</span>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        <div className="space-y-4 max-h-[160px] overflow-y-auto">
          {metrics.map((m) => (
            <div key={m.zone} className="text-xs flex items-center justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600 font-semibold">{m.zone.split(" (")[0]}</span>
              <span className="font-bold text-gray-800">{m.energyUsageKw} kW</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic AI recommendations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">EcoIQ recommendations</h3>
          </div>
          <p className="text-xs text-gray-500">Autonomous eco-routing suggestions</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] pr-1">
          {aiRecommendations.map((rec, idx) => {
            const isAlert = rec.startsWith("ALERT:") || rec.includes("high");
            const isSuccess = rec.startsWith("SYSTEM STATUS GREEN:");

            return (
              <div
                key={idx}
                className={`p-3 border rounded-xl flex gap-2.5 text-xs ${
                  isSuccess
                    ? "bg-green-50 border-green-100 text-green-800"
                    : isAlert
                    ? "bg-red-50 border-red-100 text-red-800"
                    : "bg-blue-50 border-blue-100 text-blue-800"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                ) : isAlert ? (
                  <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{rec}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-50 text-[10px] text-gray-400">
          <HelpCircle className="h-4 w-4 text-green-500" />
          <span>Waste metrics automatically decrement on ticket resolution.</span>
        </div>
      </div>
    </div>
  );
}
