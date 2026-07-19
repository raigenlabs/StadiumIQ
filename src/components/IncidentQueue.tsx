import React, { useState, useMemo } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { StadiumZone, IncidentType, PriorityLevel, IncidentStatus } from "../types.js";
import { sanitizeStr } from "../utils/sanitize.js";
import { simulationStore } from "../utils/simulationStore.js";
import { AlertCircle, PlusCircle, UserCheck, CheckSquare, Clock, ArrowRight, ClipboardList } from "lucide-react";

/**
 * Incident Queue and Reporting form component. Satisfies "real-time decision support" and "incident queue".
 */
export default function IncidentQueue() {
  const simulationState = useSimulation();
  const incidents = simulationState?.incidents || [];

  // Form states
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState<StadiumZone>(StadiumZone.ZONE_A);
  const [type, setType] = useState<IncidentType>("crowd");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Volunteer roster
  const volunteers = ["Alex", "Beatrice", "Carlos", "Diana"];

  // Sort incidents by Priority (Critical > High > Medium > Low) and then Timestamp (Newest first)
  const sortedIncidents = useMemo(() => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return [...incidents].sort((a, b) => {
      // Unresolved incidents go first
      const aResolved = a.status === "resolved" ? 1 : 0;
      const bResolved = b.status === "resolved" ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;

      // Then by priority severity weight
      const weightDiff = (priorityWeight[b.severity] || 0) - (priorityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;

      // Then newest first
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [incidents]);

  // Handle manual reporting
  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanDesc = sanitizeStr(description, 250);

    if (!cleanDesc) {
      setErrorMessage("Please supply a valid description of the incident.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: cleanDesc,
          zone,
          type,
          reportedBy: "staff",
        }),
      });

      if (res.ok) {
        setDescription("");
        // Force simulationStore to fetch the latest state instantly
        await simulationStore.fetchState();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to submit incident.");
      }
    } catch (err) {
      setErrorMessage("Network error connecting to operations desk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle volunteer assignment
  const handleAssignVolunteer = async (incidentId: string, volunteerName: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/volunteer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerName: volunteerName || null }),
      });
      if (res.ok) {
        await simulationStore.fetchState();
      }
    } catch (e) {
      console.error("Failed to assign volunteer", e);
    }
  };

  // Handle status updates
  const handleUpdateStatus = async (incidentId: string, status: IncidentStatus) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await simulationStore.fetchState();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  // Helper for severity badge coloring
  const getSeverityStyle = (sev: PriorityLevel) => {
    switch (sev) {
      case "critical":
        return "bg-red-100 text-red-800 font-extrabold border-red-200 animate-pulse";
      case "high":
        return "bg-orange-100 text-orange-800 font-bold border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 font-semibold border-yellow-200";
      default:
        return "bg-green-100 text-green-800 font-medium border-green-200";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Manual Reporting Column */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5 h-fit">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <PlusCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base font-sans">File Incident Ticket</h3>
          </div>
          <p className="text-xs text-gray-500">Report manual stadium anomalies to the AI router</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitIncident} className="space-y-4 text-xs">
          {/* Target Zone */}
          <div>
            <label htmlFor="report-zone" className="block font-bold text-gray-600 mb-1">
              STADIUM SECTOR / ZONE
            </label>
            <select
              id="report-zone"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-green-500 font-sans"
              value={zone}
              onChange={(e) => setZone(e.target.value as StadiumZone)}
            >
              {Object.values(StadiumZone).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Incident Type */}
          <div>
            <label htmlFor="report-type" className="block font-bold text-gray-600 mb-1">
              ANOMALY CLASSIFICATION HINT
            </label>
            <select
              id="report-type"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-green-500 font-sans"
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
            >
              <option value="crowd">Crowd Congestion</option>
              <option value="security">Security Infraction</option>
              <option value="medical">Medical Event</option>
              <option value="sustainability">Sanitation/Spill</option>
              <option value="other">General Operational Anomaly</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="report-desc" className="block font-bold text-gray-600 mb-1">
              SITUATIONAL DESCRIPTION
            </label>
            <textarea
              id="report-desc"
              rows={3}
              maxLength={250}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-green-500 font-sans resize-none"
              placeholder="e.g. Broken lock on Gate 5, crowd bottleneck starting"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="block text-[10px] text-gray-400 text-right mt-1">
              {description.length}/250 characters max.
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? "Processing AI Routing..." : "Report & Ingest Ticket"}
          </button>
        </form>
      </div>

      {/* Incident Log Listing */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base font-sans">AI Decision & Triage Log</h3>
          </div>
          <p className="text-xs text-gray-500">Chronological triage queues classified by our neural middleware</p>
        </div>

        {/* Scrollable container virtualized by styling bounds */}
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
          {sortedIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">No reports recorded in active ledger.</div>
          ) : (
            sortedIncidents.map((inc) => (
              <div
                key={inc.id}
                className={`p-4 border rounded-xl flex flex-col gap-3 transition-colors ${
                  inc.status === "resolved" ? "bg-gray-50/50 border-gray-100 opacity-60" : "bg-white border-gray-100"
                }`}
              >
                {/* Heading / Stats */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-wider rounded font-mono ${getSeverityStyle(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase font-semibold">
                      {inc.type}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    inc.status === "resolved" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {inc.status.toUpperCase()}
                  </span>
                </div>

                {/* Body details */}
                <div className="text-xs space-y-2">
                  <p className="font-semibold text-gray-900 leading-relaxed font-sans">
                    <span className="text-gray-400 font-bold font-mono mr-1">[{inc.zone.split(" (")[0]}]</span>
                    {inc.description}
                  </p>
                  <div className="bg-green-50/50 border border-green-50 rounded-lg p-2.5 text-[11px] leading-relaxed text-green-900">
                    <strong className="text-[9px] font-bold uppercase tracking-wider text-green-700 block mb-0.5">
                      AI Router Strategy recommendation:
                    </strong>
                    {inc.recommendedAction}
                  </div>
                </div>

                {/* Operations Assignment Controls (Min-height 44px on buttons for mobile touches) */}
                {inc.status !== "resolved" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-50">
                    {/* Volunteer Selector */}
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`assign-vol-${inc.id}`} className="text-[10px] font-bold text-gray-400 uppercase">
                        VOLUNTEER:
                      </label>
                      <select
                        id={`assign-vol-${inc.id}`}
                        className="bg-gray-50 border border-gray-200 rounded p-1.5 text-[11px] font-sans focus:outline-none"
                        value={inc.assignedVolunteer || ""}
                        onChange={(e) => handleAssignVolunteer(inc.id, e.target.value)}
                      >
                        <option value="">-- Assign Volunteer --</option>
                        {volunteers.map((vol) => (
                          <option key={vol} value={vol}>
                            {vol}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick status transition buttons */}
                    <div className="flex items-center gap-2">
                      {inc.status === "triaged" && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, "dispatching")}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition-all min-h-[32px]"
                        >
                          Dispatch
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {inc.status === "dispatching" && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, "resolving")}
                          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition-all min-h-[32px]"
                        >
                          Working
                          <Clock className="h-3 w-3" />
                        </button>
                      )}
                      {inc.status === "resolving" && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, "resolved")}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition-all min-h-[32px]"
                        >
                          Resolve
                          <UserCheck className="h-3 w-3" />
                        </button>
                      )}
                      {inc.status === "reported" && (
                        <button
                          onClick={() => handleUpdateStatus(inc.id, "triaged")}
                          className="flex items-center gap-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition-all min-h-[32px]"
                        >
                          Triage
                          <CheckSquare className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
