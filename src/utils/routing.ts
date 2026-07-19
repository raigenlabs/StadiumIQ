import { StadiumZone } from "../types.js";

interface AdjacencyMap {
  [key: string]: StadiumZone[];
}

// Map representing adjacent zones that are physically connected
const ADJACENCY_MAP: AdjacencyMap = {
  [StadiumZone.ZONE_A]: [StadiumZone.ZONE_B, StadiumZone.ZONE_D, StadiumZone.ZONE_E],
  [StadiumZone.ZONE_B]: [StadiumZone.ZONE_A, StadiumZone.ZONE_C, StadiumZone.ZONE_E, StadiumZone.ZONE_F],
  [StadiumZone.ZONE_C]: [StadiumZone.ZONE_B, StadiumZone.ZONE_D, StadiumZone.ZONE_E, StadiumZone.ZONE_F],
  [StadiumZone.ZONE_D]: [StadiumZone.ZONE_A, StadiumZone.ZONE_C, StadiumZone.ZONE_E],
  [StadiumZone.ZONE_E]: [StadiumZone.ZONE_A, StadiumZone.ZONE_B, StadiumZone.ZONE_C, StadiumZone.ZONE_D],
  [StadiumZone.ZONE_F]: [StadiumZone.ZONE_B, StadiumZone.ZONE_C],
};

interface PathNode {
  zone: StadiumZone;
  path: StadiumZone[];
  cost: number;
}

/**
 * Finds the optimal path between start and end zones, minimizing cumulative crowd density cost.
 * Uses a modified Dijkstra's/BFS algorithm to navigate around highly congested areas.
 */
export function findCongestionAwarePath(
  start: StadiumZone,
  end: StadiumZone,
  zoneDensities: Record<StadiumZone, number>
): { path: StadiumZone[]; totalCongestionScore: number; alternativeRouteRecommended: boolean } {
  if (start === end) {
    return { path: [start], totalCongestionScore: zoneDensities[start] || 0, alternativeRouteRecommended: false };
  }

  const queue: PathNode[] = [{ zone: start, path: [start], cost: zoneDensities[start] || 0 }];
  const visited = new Set<StadiumZone>([start]);
  
  let bestPath: StadiumZone[] = [];
  let bestCost = Infinity;

  while (queue.length > 0) {
    // Sort queue to pull the node with the lowest cumulative congestion cost (Dijkstra strategy)
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (current.zone === end) {
      if (current.cost < bestCost) {
        bestCost = current.cost;
        bestPath = current.path;
      }
      continue;
    }

    const neighbors = ADJACENCY_MAP[current.zone] || [];
    for (const neighbor of neighbors) {
      if (!current.path.includes(neighbor)) {
        const neighborDensity = zoneDensities[neighbor] || 0;
        // Escalated cost for congested zones to actively route pathing away
        const weight = neighborDensity > 80 ? neighborDensity * 3 : neighborDensity; 
        
        queue.push({
          zone: neighbor,
          path: [...current.path, neighbor],
          cost: current.cost + weight,
        });
      }
    }
  }

  // Determine if we are rerouting the spectator away from a direct route due to congestion
  // Example: Direct concourse (Zone E) is crowded, so we go via outer rings
  const alternativeRouteRecommended = bestPath.some(zone => (zoneDensities[zone] || 0) > 75);

  return {
    path: bestPath,
    totalCongestionScore: bestCost,
    alternativeRouteRecommended,
  };
}
