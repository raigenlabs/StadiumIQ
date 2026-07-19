import { useMemo } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { StadiumZone } from "../types.js";
import { Users, ShieldAlert, ShieldX, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

/**
 * Crowd Heatmap component. Satisfies "crowd management" and "operational intelligence" brief items.
 */
export default function CrowdHeatmap() {
  const simulationState = useSimulation();

  const metrics = simulationState?.metrics || [];

  // Helper to interpret density level into text and icon (Accessibility: Non-color-only severity indication)
  const getDensitySeverity = (density: number) => {
    if (density > 80) {
      return {
        label: "CRITICAL OVERCROWDING",
        description: "Gate closure & route diversion protocol active",
        textColor: "text-red-700",
        bgColor: "bg-red-50 border-red-100",
        icon: <ShieldX className="h-4.5 w-4.5 text-red-600 shrink-0" />,
      };
    }
    if (density > 55) {
      return {
        label: "MODERATE ACCUMULATION",
        description: "Deploy flow monitoring volunteers",
        textColor: "text-yellow-700",
        bgColor: "bg-yellow-50 border-yellow-100",
        icon: <ShieldAlert className="h-4.5 w-4.5 text-yellow-600 shrink-0" />,
      };
    }
    return {
      label: "OPTIMAL SPECTATOR FLOW",
      description: "Corridors operating below threshold limits",
      textColor: "text-green-700",
      bgColor: "bg-green-50 border-green-100",
      icon: <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0" />,
    };
  };

  // Sort metrics to list busiest zones first for operational priority
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => b.crowdDensity - a.crowdDensity);
  }, [metrics]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">Crowd Flow Heatmap</h3>
          </div>
          <p className="text-xs text-gray-500">Live zone occupancy indices</p>
        </div>

        {/* Clear Simulation Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
          <RefreshCw className="h-3 w-3 animate-spin-slow" />
          <span>Simulated Feed</span>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
          <AlertCircle className="h-8 w-8 animate-pulse mb-2 text-green-500" />
          <p className="text-xs">Synchronizing crowd sensors...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMetrics.map((metric) => {
            const severity = getDensitySeverity(metric.crowdDensity);

            return (
              <div
                key={metric.zone}
                className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${severity.bgColor}`}
              >
                {/* Zone information */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{severity.icon}</div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{metric.zone}</h4>
                    <span className={`inline-block text-[10px] font-extrabold tracking-wide uppercase mt-0.5 ${severity.textColor}`}>
                      {severity.label}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">{severity.description}</p>
                  </div>
                </div>

                {/* Meter Indicators (Accessibility: explicit value text is provided alongside visual progress) */}
                <div className="w-full sm:w-48 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-semibold text-gray-600">
                    <span>Density Ratio</span>
                    <span className="font-extrabold">{metric.crowdDensity}%</span>
                  </div>
                  {/* Visual density meter bar */}
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        metric.crowdDensity > 80
                          ? "bg-red-500"
                          : metric.crowdDensity > 55
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${metric.crowdDensity}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Clean (0%)</span>
                    <span>Cap (100%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
