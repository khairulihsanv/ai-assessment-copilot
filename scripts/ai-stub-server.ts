import http from "node:http";

export function startAiStubServer(port = 3002): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === "POST" && (req.url?.includes("/chat/completions") || req.url === "/")) {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          let criteriaIds: string[] = ["general-eval"];
          try {
            const parsed = JSON.parse(body);
            const userContent = parsed.messages?.find((m: any) => m.role === "user")?.content || "";
            // Find criterion IDs mentioned in prompt if any
            const matches = userContent.match(/"id":\s*"([^"]+)"/g);
            if (matches && matches.length > 0) {
              criteriaIds = matches.map((m: string) => m.replace(/"id":\s*"/, "").replace(/"/, ""));
            }
          } catch {
            // ignore JSON parse error in request body
          }

          const perCriterion = criteriaIds.map((cid, idx) => ({
            criterionId: cid,
            score: idx === 0 ? 50 : 35,
            reasoning: `Kriteria ${cid} terpenuhi dengan baik berdasarkan analisis dokumen.`,
          }));

          const suggestedTotalScore = perCriterion.reduce((acc, c) => acc + c.score, 0);

          const responsePayload = {
            id: `chatcmpl-stub-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: "stub-grading-model",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    perCriterion,
                    suggestedTotalScore,
                    suggestedFeedback:
                      "Uraian jawaban terstruktur dengan baik, memenuhi standar analisis kebutuhan sistem.",
                  }),
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 250,
              completion_tokens: 120,
              total_tokens: 370,
            },
          };

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(responsePayload));
        });
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    server.listen(port, "127.0.0.1", () => {
      console.log(`[ai-stub-server] Deterministic AI stub running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const port = Number(process.env.AI_STUB_PORT || 3002);
  startAiStubServer(port);
}
