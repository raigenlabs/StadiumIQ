import { useState, useMemo } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { StadiumZone } from "../types.js";
import { findCongestionAwarePath } from "../utils/routing.js";
import { Compass, AlertTriangle, CheckCircle, Navigation } from "lucide-react";

/**
 * Smart Navigation component. Satisfies "navigation" and "crowd management" brief items.
 */
export default function SmartNavigation() {
  const simulationState = useSimulation();
  const [startZone, setStartZone] = useState<StadiumZone>(StadiumZone.ZONE_A);
  const [endZone, setEndZone] = useState<StadiumZone>(StadiumZone.ZONE_C);

  // Compile densities into an easily searchable map
  const densities = useMemo(() => {
    const map = {} as Record<StadiumZone, number>;
    if (simulationState) {
      simulationState.metrics.forEach((m) => {
        map[m.zone] = m.crowdDensity;
      });
    } else {
      // Fallbacks if server data not loaded yet
      Object.values(StadiumZone).forEach((z) => {
        map[z] = 50;
      });
    }
    return map;
  }, [simulationState]);

  // Compute congestion-aware route
  const routeResult = useMemo(() => {
    return findCongestionAwarePath(startZone, endZone, densities);
  }, [startZone, endZone, densities]);

  const pathSet = useMemo(() => new Set(routeResult.path), [routeResult.path]);

  // Helper to color zones based on congestion or inclusion in path
  const getZoneFillColor = (zone: StadiumZone) => {
    const isPartOfPath = pathSet.has(zone);
    const density = densities[zone] || 0;

    if (isPartOfPath) {
      return "fill-green-100 stroke-green-600 stroke-[3]";
    }
    if (density > 80) {
      return "fill-red-50 hover:fill-red-100 stroke-red-300 stroke-2";
    }
    if (density > 55) {
      return "fill-yellow-50 hover:fill-yellow-100 stroke-yellow-300 stroke-2";
    }
    return "fill-blue-50 hover:fill-blue-100 stroke-blue-200 stroke-2";
  };

  // Helper to return density badge color
  const getDensityBadge = (density: number) => {
    if (density > 80) return "bg-red-100 text-red-800 font-bold";
    if (density > 55) return "bg-yellow-100 text-yellow-800 font-medium";
    return "bg-green-100 text-green-800 font-medium";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
      {/* Configuration & Directions */}
      <div className="flex-1 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">Smart Wayfinding</h3>
          </div>
          <p className="text-xs text-gray-500">Crowd-avoiding navigation routing</p>
        </div>

        {/* Start/End selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-zone" className="block text-xs font-semibold text-gray-500 mb-1.5">
              CURRENT LOCATION
            </label>
            <select
              id="start-zone"
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-green-500"
              value={startZone}
              onChange={(e) => setStartZone(e.target.value as StadiumZone)}
            >
              {Object.values(StadiumZone).map((z) => (
                <option key={z} value={z}>
                  {z.split(" (")[0]} ({densities[z]}% crowd)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="end-zone" className="block text-xs font-semibold text-gray-500 mb-1.5">
              GOAL DESTINATION
            </label>
            <select
              id="end-zone"
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-green-500"
              value={endZone}
              onChange={(e) => setEndZone(e.target.value as StadiumZone)}
            >
              {Object.values(StadiumZone).map((z) => (
                <option key={z} value={z}>
                  {z.split(" (")[0]} ({densities[z]}% crowd)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Turn-by-Turn Guide */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-green-600" />
            Optimal Path Guidance
          </h4>

          {routeResult.alternativeRouteRecommended ? (
            <div className="flex gap-2 p-2 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-lg text-[11px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
              <span>
                <strong>Bypass Routing Active:</strong> Direct route contains heavy crowd density (&gt;75%). StadiumIQ has rerouted you to ensure a smoother transit.
              </span>
            </div>
          ) : (
            <div className="flex gap-2 p-2 bg-green-50 border border-green-100 text-green-800 rounded-lg text-[11px] leading-relaxed">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <span>Standard clear corridors available. Routing via shortest optimal pathway.</span>
            </div>
          )}

          <div className="relative pl-4 space-y-3 border-l-2 border-dashed border-gray-200">
            {routeResult.path.map((zone, idx) => (
              <div key={zone} className="relative text-xs">
                {/* Visual marker dot */}
                <div
                  className={`absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full border-2 bg-white ${
                    idx === 0
                      ? "border-green-600 bg-green-600 ring-4 ring-green-100"
                      : idx === routeResult.path.length - 1
                      ? "border-green-600"
                      : "border-gray-400"
                  }`}
                />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{zone.split(" (")[0]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${getDensityBadge(densities[zone] || 0)}`}>
                    {densities[zone]}% density
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {idx === 0 ? "Depart from point" : idx === routeResult.path.length - 1 ? "Arrive at destination" : "Proceed through corridor"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Stadium Map */}
      <div className="w-full md:w-64 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stadium Arena Map</h4>
        <div className="w-full max-w-[220px] aspect-square relative">
          <svg viewBox="0 0 200 200" className="w-full h-full transition-all">
            {/* Background Outer Ring */}
            <circle cx="100" cy="100" r="90" className="fill-none stroke-gray-100 stroke-[4]" />

            {/* Zone A: North Stand (Top arch) */}
            <path
              d="M 40 40 A 85 85 0 0 1 160 40 L 140 60 A 55 55 0 0 0 60 60 Z"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_A)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_A)}
              role="button"
              aria-label="Zone A polygon"
            />
            <text x="100" y="52" className="text-[9px] font-bold fill-gray-700 text-anchor-middle text-center" textAnchor="middle">
              A
            </text>

            {/* Zone B: East Stand (Right arch) */}
            <path
              d="M 160 40 A 85 85 0 0 1 160 160 L 140 140 A 55 55 0 0 0 140 60 Z"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_B)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_B)}
              role="button"
              aria-label="Zone B polygon"
            />
            <text x="148" y="103" className="text-[9px] font-bold fill-gray-700" textAnchor="middle">
              B
            </text>

            {/* Zone C: South Stand (Bottom arch) */}
            <path
              d="M 160 160 A 85 85 0 0 1 40 160 L 60 140 A 55 55 0 0 0 140 140 Z"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_C)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_C)}
              role="button"
              aria-label="Zone C polygon"
            />
            <text x="100" y="154" className="text-[9px] font-bold fill-gray-700" textAnchor="middle">
              C
            </text>

            {/* Zone D: West Stand (Left arch) */}
            <path
              d="M 40 160 A 85 85 0 0 1 40 40 L 60 60 A 55 55 0 0 0 60 140 Z"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_D)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_D)}
              role="button"
              aria-label="Zone D polygon"
            />
            <text x="52" y="103" className="text-[9px] font-bold fill-gray-700" textAnchor="middle">
              D
            </text>

            {/* Zone E: Concourse (Inner Ring) */}
            <circle
              cx="100"
              cy="100"
              r="30"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_E)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_E)}
              role="button"
              aria-label="Zone E circle"
            />
            <text x="100" y="103" className="text-[9px] font-bold fill-gray-700" textAnchor="middle">
              E
            </text>

            {/* Zone F: Plaza / Fan Fest (Detached circle) */}
            <circle
              cx="165"
              cy="165"
              r="18"
              className={`transition-all duration-300 cursor-pointer ${getZoneFillColor(StadiumZone.ZONE_F)}`}
              onClick={() => setStartZone(StadiumZone.ZONE_F)}
              role="button"
              aria-label="Zone F circle"
            />
            <text x="165" y="168" className="text-[9px] font-bold fill-gray-700" textAnchor="middle">
              F
            </text>
          </svg>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-3">
          Click any zone polygon on map to set start location. Green highlight signifies your computed path.
        </p>
      </div>
    </div>
  );
}
