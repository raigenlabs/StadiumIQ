import { useSimulation } from "../hooks/useSimulation.js";
import { Train, Bus, ParkingSquare, Clock, AlertTriangle, CheckCircle, Info } from "lucide-react";

/**
 * Transport Status component. Satisfies the "transportation" capability in the build specifications.
 */
export default function TransportStatus() {
  const simulationState = useSimulation();

  const feeds = simulationState?.transportFeeds || [];

  // Helper to map transportation icons
  const getFeedIcon = (type: "metro" | "shuttle" | "parking") => {
    switch (type) {
      case "metro":
        return <Train className="h-5 w-5 text-blue-600" />;
      case "shuttle":
        return <Bus className="h-5 w-5 text-yellow-600" />;
      case "parking":
        return <ParkingSquare className="h-5 w-5 text-green-600" />;
    }
  };

  // Helper for status styling
  const getStatusDetails = (status: "smooth" | "congested" | "delayed" | "critical") => {
    switch (status) {
      case "smooth":
        return {
          badge: "bg-green-100 text-green-800",
          border: "border-green-100 hover:border-green-300",
          text: "Smooth Flow",
          indicatorColor: "bg-green-500",
        };
      case "congested":
        return {
          badge: "bg-yellow-100 text-yellow-800",
          border: "border-yellow-100 hover:border-yellow-300",
          text: "Congested",
          indicatorColor: "bg-yellow-500",
        };
      case "delayed":
        return {
          badge: "bg-orange-100 text-orange-800",
          border: "border-orange-100 hover:border-orange-300",
          text: "Delayed",
          indicatorColor: "bg-orange-500",
        };
      case "critical":
        return {
          badge: "bg-red-100 text-red-800",
          border: "border-red-100 hover:border-red-300",
          text: "Critical Crowd Block",
          indicatorColor: "bg-red-500",
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <Train className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">Transport Status</h3>
          </div>
          <p className="text-xs text-gray-500">Live shuttle, metro & parking feeds with AI Wait Estimates</p>
        </div>
        {/* Clear Simulation Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
          </span>
          <span>Simulated Feed</span>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
          <Clock className="h-8 w-8 animate-pulse mb-2 text-green-500" />
          <p className="text-xs">Synchronizing transit feeds...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {feeds.map((feed) => {
            const statusConfig = getStatusDetails(feed.status);
            const isEstElevated = feed.aiEstimatedWaitTimeMin > feed.baseWaitTimeMin;

            return (
              <div
                key={feed.id}
                className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${statusConfig.border}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gray-50 rounded-lg">{getFeedIcon(feed.type)}</div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{feed.name}</h4>
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[9px] font-semibold ${statusConfig.badge}`}>
                        {statusConfig.text}
                      </span>
                    </div>
                  </div>
                  {/* Pulsing indicator */}
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.indicatorColor}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.indicatorColor}`} />
                  </span>
                </div>

                <p className="text-[10px] text-gray-400 leading-relaxed">{feed.description}</p>

                {/* Wait time comparison stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 bg-gray-50 p-2 rounded-lg text-center">
                  <div>
                    <span className="block text-[8px] text-gray-400 font-bold uppercase tracking-wider">Scheduled</span>
                    <span className="text-xs font-semibold text-gray-700">{feed.baseWaitTimeMin} mins</span>
                  </div>
                  <div className="border-l border-gray-100">
                    <span className="block text-[8px] text-green-600 font-bold uppercase tracking-wider">AI Estimate</span>
                    <span className={`text-xs font-extrabold flex items-center justify-center gap-1 ${isEstElevated ? "text-orange-600" : "text-green-600"}`}>
                      {feed.aiEstimatedWaitTimeMin} mins
                      {isEstElevated && <AlertTriangle className="h-3 w-3 shrink-0" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 bg-green-50/50 p-3 rounded-xl border border-green-50 text-[10px] text-green-800 leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 text-green-600" />
        <span>
          <strong>Simulated Live Feeds Note:</strong> Transit wait times are calculated using real-time crowd density parameters in active sectors. When stadium congestion rises, AI wait time estimators escalate automatically to prevent bottleneck boarding queues.
        </span>
      </div>
    </div>
  );
}
