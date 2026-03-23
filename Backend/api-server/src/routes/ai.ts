import { Router, type IRouter } from "express";
import {
  getProjectById,
  listSprintsByProject,
  listTasksByProject,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const AI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

async function getProjectContext(projectId: number) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  const tasks = await listTasksByProject(projectId);
  const sprints = await listSprintsByProject(projectId);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const backlogTasks = tasks.filter(t => t.status === "backlog").length;

  return { project, tasks, sprints, totalTasks, doneTasks, inProgressTasks, backlogTasks };
}

router.post("/ai/analyze-project", async (req, res) => {
  try {
    const { projectId, includeFinancial } = req.body;
    const ctx = await getProjectContext(projectId);
    const { project, totalTasks, doneTasks, inProgressTasks, backlogTasks, sprints } = ctx;

    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : parseFloat(project.completionRate || "0");

    const prompt = `You are a senior business analyst for First Registrars and Investor Services, a financial services company.

Analyze this project and provide insights:

PROJECT: "${project.name}"
Type: ${project.type}
Status: ${project.status}
Priority: ${project.priority}
Country: ${project.country || "Not specified"}
Budget: ${project.budget ? `₦${parseFloat(project.budget).toLocaleString()}` : "Not specified"}
Start Date: ${project.startDate || "Not specified"}
End Date: ${project.endDate || "Not specified"}
Completion Rate: ${completionRate.toFixed(1)}%

TASK BREAKDOWN:
- Total Tasks: ${totalTasks}
- Completed: ${doneTasks}
- In Progress: ${inProgressTasks}
- Backlog: ${backlogTasks}

SPRINTS: ${sprints.length} sprint(s) created, ${sprints.filter(s => s.status === "completed").length} completed

${includeFinancial ? "Include financial sustainability analysis." : ""}

Respond with a JSON object with these exact keys:
{
  "summary": "2-3 sentence executive summary",
  "completionRateAnalysis": "Analysis of the completion rate trend",
  "profitabilityScore": <number 0-100>,
  "recommendation": "<one of: continue|pause|stop|expand|review>",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "risks": ["risk 1", "risk 2"],
  "versionAdvice": null,
  "countryAnalysis": null
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: `Failed to analyze project: ${msg}` });
  }
});

router.post("/ai/business-advice", async (req, res) => {
  try {
    const { projectId, country, question } = req.body;
    const ctx = await getProjectContext(projectId);
    const { project, totalTasks, doneTasks } = ctx;

    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : parseFloat(project.completionRate || "0");

    const prompt = `You are a strategic business advisor for First Registrars and Investor Services, a financial services company operating across Africa.

Provide business advice for this project in the context of doing business in ${country}:

PROJECT: "${project.name}"
Description: ${project.description || "No description"}
Type: ${project.type}
Status: ${project.status}
Budget: ${project.budget ? `₦${parseFloat(project.budget).toLocaleString()}` : "Not specified"}
Completion: ${completionRate.toFixed(1)}%
Country Context: ${country}

${question ? `Specific Question: ${question}` : "Provide general business viability assessment."}

Consider:
- Regulatory environment in ${country}
- Market conditions and competition
- Long-term profitability for a financial services company
- Risk factors specific to ${country}
- Whether to continue, pause, expand, or stop the project
- Return on investment potential

Respond with a JSON object:
{
  "summary": "Executive summary about viability in ${country}",
  "completionRateAnalysis": "How completion rate affects business outcomes",
  "profitabilityScore": <number 0-100>,
  "recommendation": "<one of: continue|pause|stop|expand|review>",
  "insights": ["market insight", "regulatory insight", "opportunity insight"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "risks": ["country-specific risk 1", "risk 2", "risk 3"],
  "versionAdvice": null,
  "countryAnalysis": "Detailed analysis of doing business in ${country} for this type of project"
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: `Failed to get business advice: ${msg}` });
  }
});

router.post("/ai/version-advice", async (req, res) => {
  try {
    const { projectId } = req.body;
    const ctx = await getProjectContext(projectId);
    const { project, tasks, sprints, totalTasks, doneTasks } = ctx;

    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : parseFloat(project.completionRate || "0");
    const completedSprints = sprints.filter(s => s.status === "completed").length;
    const bugs = tasks.filter(t => t.type === "bug").length;
    const completedBugs = tasks.filter(t => t.type === "bug" && t.status === "done").length;

    const prompt = `You are a product strategist for First Registrars and Investor Services.

Advise on when Version 2 of this project should be released and what improvements to make:

PROJECT: "${project.name}"
Description: ${project.description || "No description"}
Type: ${project.type}
Status: ${project.status}
Completion: ${completionRate.toFixed(1)}%
Completed Sprints: ${completedSprints}/${sprints.length}
Total Tasks: ${totalTasks} (${doneTasks} done)
Bug Ratio: ${bugs > 0 ? `${completedBugs}/${bugs} bugs resolved` : "No bugs logged"}
Start Date: ${project.startDate || "Not set"}
End Date: ${project.endDate || "Not set"}

Provide strategic advice on:
1. When to release Version 2
2. What features/improvements to include in Version 2
3. How to improve the current version before V2
4. Success metrics to track

Respond with a JSON object:
{
  "summary": "Summary of V2 strategy",
  "completionRateAnalysis": "What the current completion rate means for V2 readiness",
  "profitabilityScore": <number 0-100>,
  "recommendation": "<one of: continue|pause|stop|expand|review>",
  "insights": ["V2 readiness insight", "market timing insight", "technical insight"],
  "suggestions": ["V2 feature suggestion 1", "V2 feature suggestion 2", "improvement suggestion"],
  "risks": ["V2 launch risk 1", "risk 2"],
  "versionAdvice": "Detailed advice on V2 timeline and roadmap",
  "countryAnalysis": null
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: `Failed to get version advice: ${msg}` });
  }
});

export default router;
