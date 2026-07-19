import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { getSimulationState, runSimulationTick, createNewIncident, assignVolunteerToIncident, updateIncidentStatus } from "./server/logic/simulation.js";
import { streamChatResponse } from "./server/logic/chatService.js";
import { streamDigestReport } from "./server/logic/digestService.js";
import { isRateLimited } from "./server/logic/rateLimiter.js";
import { sanitizeStr } from "./src/utils/sanitize.js";
import { StadiumZone, IncidentType, IncidentStatus } from "./src/types.js";

// Load environment variables
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // 1. JSON and URLencoded parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 2. Strict Security Headers matching our brief requirements
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // In production, we enforce a strict Content Security Policy without unsafe-inline or unsafe-eval on scripts.
    // In development, we allow unsafe-inline/eval and websocket connections for Vite's HMR and dev client.
    const isProd = process.env.NODE_ENV === "production";
    const csp = isProd
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; frame-ancestors 'self' https://*.google.com https://*.studio.google https://*.aistudio.google https://ai.studio https://*.run.app;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data: https:; frame-ancestors 'self' https://*.google.com https://*.studio.google https://*.aistudio.google https://ai.studio https://*.run.app;";
    
    res.setHeader("Content-Security-Policy", csp);
    next();
  });

  // 3. Custom Token-Bucket Rate Limiter Middleware
  const aiRateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown-ip";
    if (isRateLimited(ip, 15, 0.5)) {
      res.status(429).json({ error: "Too many operations requested. AI rate limit active." });
      return;
    }
    next();
  };

  // 4. Ingestion Simulation Tick - Run every 10 seconds to update live feeds naturally
  setInterval(async () => {
    try {
      await runSimulationTick();
    } catch (err) {
      console.error("Simulation tick error:", err);
    }
  }, 10000);

  // ================= API ENDPOINTS =================

  /**
   * GET /api/simulation
   * Returns current snapshot of the stadium's simulation feeds.
   */
  app.get("/api/simulation", (req, res) => {
    res.json(getSimulationState());
  });

  /**
   * POST /api/incidents
   * Creates a new manual incident, sanitizes inputs at point of entry,
   * and processes through the AI Decision Engine.
   */
  app.post("/api/incidents", aiRateLimitMiddleware, async (req, res): Promise<void> => {
    try {
      const description = sanitizeStr(req.body.description || "");
      const zone = req.body.zone as StadiumZone;
      const type = req.body.type as IncidentType;
      const reportedBy = sanitizeStr(req.body.reportedBy || "fan") as "sensor" | "fan" | "staff";

      // Validation
      if (!description) {
        res.status(400).json({ error: "Missing required parameter: description" });
        return;
      }

      const validZones = Object.values(StadiumZone);
      if (!validZones.includes(zone)) {
        res.status(400).json({ error: "Invalid stadium zone specified" });
        return;
      }

      const validTypes: IncidentType[] = ["crowd", "security", "medical", "sustainability", "other"];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: "Invalid incident type specified" });
        return;
      }

      const newIncident = await createNewIncident(description, zone, type, reportedBy);
      res.status(201).json(newIncident);
    } catch (err) {
      res.status(500).json({ error: "An internal error occurred while reporting the incident." });
    }
  });

  /**
   * POST /api/incidents/:id/volunteer
   * Assigns a volunteer to an incident ticket.
   */
  app.post("/api/incidents/:id/volunteer", (req, res): void => {
    const id = sanitizeStr(req.params.id);
    const volunteerName = req.body.volunteerName ? sanitizeStr(req.body.volunteerName) : null;

    const updated = assignVolunteerToIncident(id, volunteerName);
    if (!updated) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.json(updated);
  });

  /**
   * POST /api/incidents/:id/status
   * Updates an incident ticket's progress/workflow status.
   */
  app.post("/api/incidents/:id/status", (req, res): void => {
    const id = sanitizeStr(req.params.id);
    const status = sanitizeStr(req.body.status) as IncidentStatus;

    const validStatuses: IncidentStatus[] = ["reported", "triaged", "dispatching", "resolving", "resolved"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const updated = updateIncidentStatus(id, status);
    if (!updated) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.json(updated);
  });

  /**
   * GET /api/chat-stream (SSE)
   * Streams the multilingual assistant response, rate-limited and sanitizing inputs.
   */
  app.get("/api/chat-stream", aiRateLimitMiddleware, (req, res): void => {
    const message = sanitizeStr(req.query.message || "");
    const rawHistory = sanitizeStr(req.query.history || "[]", 2000);

    let history: Array<{ role: "user" | "model"; text: string }> = [];
    try {
      history = JSON.parse(rawHistory);
    } catch (e) {
      history = [];
    }

    if (!message) {
      res.status(400).write(`data: ${JSON.stringify({ error: "Missing message query" })}\n\n`);
      res.end();
      return;
    }

    // Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    streamChatResponse(
      message,
      history,
      (textChunk) => {
        res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
      },
      (detectedLang) => {
        res.write(`data: ${JSON.stringify({ done: true, languageDetected: detectedLang })}\n\n`);
        res.end();
      }
    ).catch(() => {
      res.write(`data: ${JSON.stringify({ done: true, error: "Stream error occurred" })}\n\n`);
      res.end();
    });
  });

  /**
   * GET /api/digest-stream (SSE)
   * Streams the End-of-day operations summary intelligence, rate-limited.
   */
  app.get("/api/digest-stream", aiRateLimitMiddleware, (req, res): void => {
    // Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    streamDigestReport(
      (textChunk) => {
        res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
      },
      () => {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    ).catch(() => {
      res.write(`data: ${JSON.stringify({ done: true, error: "Stream error occurred" })}\n\n`);
      res.end();
    });
  });

  // ================= VITE ASSET SERVING =================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[StadiumIQ Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
