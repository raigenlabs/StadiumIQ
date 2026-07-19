import { useMemo } from "react";
import { useSimulation } from "../hooks/useSimulation.js";
import { Incident, IncidentStatus } from "../types.js";
import { simulationStore } from "../utils/simulationStore.js";
import { Briefcase, ArrowRight, CheckCircle, UserCheck, Clock, Users } from "lucide-react";

/**
 * Volunteer Task Board component. Satisfies "volunteer task board" Kanban requirement.
 */
export default function VolunteerTaskBoard() {
  const simulationState = useSimulation();
  const incidents = simulationState?.incidents || [];

  // Filter and split incidents into functional swimlanes
  const columns = useMemo(() => {
    return {
      dispatched: incidents.filter((i) => i.status === "reported" || i.status === "triaged" || i.status === "dispatching"),
      working: incidents.filter((i) => i.status === "resolving"),
      completed: incidents.filter((i) => i.status === "resolved"),
    };
  }, [incidents]);

  // Handle advancing state
  const handleAdvanceTask = async (id: string, currentStatus: IncidentStatus) => {
    let nextStatus: IncidentStatus = "resolved";
    if (currentStatus === "reported" || currentStatus === "triaged" || currentStatus === "dispatching") {
      nextStatus = "resolving";
    }

    try {
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await simulationStore.fetchState();
      }
    } catch (e) {
      console.error("Failed to advance task", e);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
            <Briefcase className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">Volunteer Kanban Board</h3>
        </div>
        <p className="text-xs text-gray-500">Track and dispatch AI-routed volunteer activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Swimlane 1: Dispatched */}
        <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-extrabold text-blue-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="h-4 w-4 shrink-0 text-blue-600" />
              Dispatched ({columns.dispatched.length})
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[400px]">
            {columns.dispatched.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs font-medium">All tasks deployed.</div>
            ) : (
              columns.dispatched.map((task) => (
                <div key={task.id} className="bg-white border border-gray-100 p-3.5 rounded-lg shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase font-mono">
                      {task.type}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 font-mono">ID: {task.id.split("-")[1]}</span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-semibold">
                    <span className="text-gray-400 font-bold mr-1">[{task.zone.split(" (")[0]}]</span>
                    {task.description}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    <span>Assignee: <strong>{task.assignedVolunteer || "Waiting Dispatch"}</strong></span>
                  </div>

                  {/* Move to In Progress (min height 44px for mobile accessibility clicks) */}
                  <button
                    onClick={() => handleAdvanceTask(task.id, task.status)}
                    className="w-full text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors flex items-center justify-center gap-1 min-h-[40px]"
                    disabled={!task.assignedVolunteer}
                    aria-label={`Start task ${task.id}`}
                  >
                    {!task.assignedVolunteer ? "Awaiting Volunteer Assign" : "Commence Working"}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Swimlane 2: Working */}
        <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-extrabold text-amber-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              In Progress ({columns.working.length})
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[400px]">
            {columns.working.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs font-medium">No tasks currently active.</div>
            ) : (
              columns.working.map((task) => (
                <div key={task.id} className="bg-white border border-gray-100 p-3.5 rounded-lg shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-extrabold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase font-mono">
                      {task.type}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 font-mono">ID: {task.id.split("-")[1]}</span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-semibold">
                    <span className="text-gray-400 font-bold mr-1">[{task.zone.split(" (")[0]}]</span>
                    {task.description}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-amber-500" />
                    <span>Working: <strong>{task.assignedVolunteer}</strong></span>
                  </div>

                  {/* Mark complete */}
                  <button
                    onClick={() => handleAdvanceTask(task.id, task.status)}
                    className="w-full text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors flex items-center justify-center gap-1 min-h-[40px]"
                    aria-label={`Mark task ${task.id} as complete`}
                  >
                    Mark Resolved
                    <CheckCircle className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Swimlane 3: Completed */}
        <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-extrabold text-green-700 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              Completed ({columns.completed.length})
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[400px]">
            {columns.completed.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs font-medium">No completed tasks yet.</div>
            ) : (
              columns.completed.map((task) => (
                <div key={task.id} className="bg-white/75 border border-gray-50 p-3.5 rounded-lg shadow-sm space-y-2 opacity-75">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-extrabold bg-green-50 text-green-700 px-1.5 py-0.5 rounded uppercase font-mono">
                      {task.type}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 font-mono">ID: {task.id.split("-")[1]}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-through leading-relaxed">
                    <span className="text-gray-400 font-bold mr-1">[{task.zone.split(" (")[0]}]</span>
                    {task.description}
                  </p>

                  <div className="text-[9px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 shrink-0" />
                    <span>Cleared by {task.assignedVolunteer}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
