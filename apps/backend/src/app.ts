import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import classesRouter from "./routes/classes.js";
import assignmentsRouter from "./routes/assignments.js";
import rubricsRouter from "./routes/rubrics.js";
import submissionsRouter from "./routes/submissions.js";
import submissionDetailsRouter from "./routes/submission-details.js";
import documentVersionsRouter from "./routes/document-versions.js";
import referenceSetsRouter from "./routes/reference-sets.js";
import aiRouter from "./routes/ai.js";
import dashboardRouter from "./routes/dashboard.js";
import analyticsRouter from "./routes/analytics.js";
import gradesRouter from "./routes/grades.js";
import gradingHubRouter from "./routes/grading-hub.js";
import rubricsHubRouter from "./routes/rubrics-hub.js";
import assignmentsOverviewRouter from "./routes/assignments-overview.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.onError((err, c) => {
  console.error("Backend error:", err);
  return c.json({ error: err.message || "Internal server error" }, 500);
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/classes", classesRouter);
app.route("/classes/:classId/assignments", assignmentsRouter);
app.route("/classes/:classId/rubrics", rubricsRouter);
app.route("/classes/:classId/assignments/:assignmentId/submissions", submissionsRouter);
app.route("/submissions", submissionDetailsRouter);
app.route("/document-versions", documentVersionsRouter);
app.route("/reference-sets", referenceSetsRouter);
app.route("/ai", aiRouter);
app.route("/dashboard", dashboardRouter);
app.route("/analytics", analyticsRouter);
app.route("/grades", gradesRouter);
app.route("/grading-hub", gradingHubRouter);
app.route("/rubrics-hub", rubricsHubRouter);
app.route("/assignments-overview", assignmentsOverviewRouter);

export default app;
