import { useMemo, useState } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { StadiumZone } from "../types.js";
import { Accessibility, Eye, HelpCircle, HeartHandshake, ShieldAlert } from "lucide-react";

/**
 * Accessibility Assistant component. Satisfies "accessibility" and "transportation" brief items.
 */
export default function AccessibilityAssistant() {
  const simulationState = useSimulation();
  const [selectedFacility, setSelectedFacility] = useState<"sensory" | "wheelchair" | "elevators">("sensory");

  // Map zone densities dynamically
  const densities = useMemo(() => {
    const map = {} as Record<StadiumZone, number>;
    if (simulationState) {
      simulationState.metrics.forEach((m) => {
        map[m.zone] = m.crowdDensity;
      });
    }
    return map;
  }, [simulationState]);

  // Determine sensory comfort in real time based on active densities
  const sensoryComfortLevel = useMemo(() => {
    const dDensity = densities[StadiumZone.ZONE_D] || 50;
    const aDensity = densities[StadiumZone.ZONE_A] || 50;

    if (dDensity < 45) {
      return {
        zone: StadiumZone.ZONE_D,
        rating: "Excellent (Very Calm)",
        color: "text-green-700 bg-green-50 border-green-100",
        advice: "Zone D Sector 102 Quiet Room is operating under low ambient noise. Ideal sensory conditions.",
      };
    } else if (aDensity < 45) {
      return {
        zone: StadiumZone.ZONE_A,
        rating: "Good (Calm Alternative)",
        color: "text-blue-700 bg-blue-50 border-blue-100",
        advice: "Zone D is moderately busy. We recommend our alternative quiet enclave in Zone A, Sector 208.",
      };
    } else {
      return {
        zone: StadiumZone.ZONE_A,
        rating: "Busy (Moderate Noise)",
        color: "text-yellow-700 bg-yellow-50 border-yellow-100",
        advice: "Both main sensory enclaves are experiencing high transit volumes. Head to Zone D, First Aid station for clinical quiet space.",
      };
    }
  }, [densities]);

  // Evaluate elevator pathways and density blockage
  const elevatorStatus = useMemo(() => {
    const eDensity = densities[StadiumZone.ZONE_E] || 50; // Central concourse
    if (eDensity > 80) {
      return {
        status: "High Congestion",
        color: "text-red-700 bg-red-50 border-red-200",
        advice: "Corridor E lift banks are highly crowded. Priority queues are managed by volunteers; please show your accessibility card.",
      };
    }
    if (eDensity > 55) {
      return {
        status: "Moderate Delay",
        color: "text-yellow-700 bg-yellow-50 border-yellow-200",
        advice: "Lifts in Concourse E are active, expects minor queues of 2-4 minutes.",
      };
    }
    return {
      status: "Fully Clear",
      color: "text-green-700 bg-green-50 border-green-200",
      advice: "Concourse lifts have high throughput and zero waiting times.",
    };
  }, [densities]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
            <Accessibility className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">Accessibility Assistant</h3>
        </div>
        <p className="text-xs text-gray-500">Accessible routes and sensory inclusion guides</p>
      </div>

      {/* Touch-Friendly Facility Navigation Tabs (min-height 44px to satisfy mobile requirements) */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setSelectedFacility("sensory")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all min-h-[44px] ${
            selectedFacility === "sensory"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
          aria-selected={selectedFacility === "sensory"}
          role="tab"
        >
          Sensory Enclaves
        </button>
        <button
          onClick={() => setSelectedFacility("wheelchair")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all min-h-[44px] ${
            selectedFacility === "wheelchair"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
          aria-selected={selectedFacility === "wheelchair"}
          role="tab"
        >
          Wheelchair Pathways
        </button>
        <button
          onClick={() => setSelectedFacility("elevators")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all min-h-[44px] ${
            selectedFacility === "elevators"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
          aria-selected={selectedFacility === "elevators"}
          role="tab"
        >
          Elevators & Lifts
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-[160px] flex flex-col justify-between">
        {selectedFacility === "sensory" && (
          <div className="space-y-4 animate-fade-in">
            <div className={`p-4 border rounded-xl flex items-start gap-3 ${sensoryComfortLevel.color}`}>
              <Eye className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide">Sensory Comfort Rating</h4>
                <p className="text-sm font-semibold mt-0.5">{sensoryComfortLevel.rating}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{sensoryComfortLevel.advice}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2">
              <span className="font-semibold text-gray-800 block">Sensory Support Services available:</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-500">
                <li>Noise-cancelling headphones available at all Guest Service desk kiosks</li>
                <li>Fidget devices and weighted lap pads accessible upon request</li>
                <li>Designated dim-lit sensory rooms equipped with visual bubble tubes</li>
              </ul>
            </div>
          </div>
        )}

        {selectedFacility === "wheelchair" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-green-50 border border-green-100 text-green-800 rounded-xl flex items-start gap-3">
              <HeartHandshake className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide">Stepless Corridors Active</h4>
                <p className="text-xs mt-1 leading-relaxed">
                  All security checkpoint lanes feature dedicated step-free wheelchair entryways. Turnstiles in **Zone A** and **Zone D** are optimized with wider 95cm lanes.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2">
              <span className="font-semibold text-gray-800 block">Accessible Seating & Transport notes:</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-500">
                <li>Companion seating is situated directly adjacent to wheelchair spaces</li>
                <li>Dedicated drop-off zone at Gate C allows private mobility taxis</li>
                <li>Priority queueing handles boarding for all accessible transport shuttles</li>
              </ul>
            </div>
          </div>
        )}

        {selectedFacility === "elevators" && (
          <div className="space-y-4 animate-fade-in">
            <div className={`p-4 border rounded-xl flex items-start gap-3 ${elevatorStatus.color}`}>
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide">Concourse E Lift Status</h4>
                <p className="text-sm font-semibold mt-0.5">{elevatorStatus.status}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{elevatorStatus.advice}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2">
              <span className="font-semibold text-gray-800 block">Elevator Operation Protocols:</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-500">
                <li>All concourse lifts feature braille tactile button arrays</li>
                <li>Audible speech synthesis signals floor landings and door statuses</li>
                <li>Volunteers are stationed to monitor lift queues and prioritize mobility-impaired guests</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
        <HelpCircle className="h-4 w-4 text-green-500" />
        <span>Need mobility assistance dispatch? Signal a volunteer or request at any Fan Hub desk.</span>
      </div>
    </div>
  );
}
