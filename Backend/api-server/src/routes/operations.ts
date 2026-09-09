import { Router, type IRouter } from "express";
import {
  assignAgmStaff,
  completeAgmVenueInspection,
  confirmAgmEngagementLogged,
  createAgmAction,
  createAgmEngagement,
  createAgmMeeting,
  createAgmResolution,
  createPlaybook,
  createTimeLog,
  decideAgmApproval,
  getAgmEngagementById,
  getAgmEngagementsSummary,
  getAgmWorkspace,
  getOperationsSummary,
  initiateAgmVenueInspection,
  linkAgmEngagementToMeeting,
  listAgmActions,
  listAgmEngagements,
  listAgmMeetings,
  listAgmResolutions,
  listOpsAlerts,
  listOpsApprovals,
  listPlaybooks,
  listTimeLogs,
  notifyAgmDepartments,
  recordAgmProxyCapture,
  recordGovernanceEvent,
  requestAgmItBriefing,
  sendAgmDemandNotice,
  sendAgmLogisticsPack,
  setAgmDividendPosition,
  submitAgmItemsRequired,
  updateAgmAction,
  updateAgmAttendee,
  updateAgmDocument,
  updateAgmMeeting,
  updateAgmResolution,
  updateOpsAlert,
  updateOpsApproval,
  voteOnResolution,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/operations/summary", async (_req, res) => {
  try {
    res.json(await getOperationsSummary());
  } catch {
    res.status(500).json({ error: "Failed to load operations summary" });
  }
});

router.get("/operations/alerts", async (_req, res) => {
  try {
    res.json(await listOpsAlerts());
  } catch {
    res.status(500).json({ error: "Failed to load alerts" });
  }
});

router.put("/operations/alerts/:id", async (req, res) => {
  try {
    const alert = await updateOpsAlert(parseInt(req.params.id), {
      status: req.body.status,
    });
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch {
    res.status(500).json({ error: "Failed to update alert" });
  }
});

router.get("/operations/approvals", async (_req, res) => {
  try {
    res.json(await listOpsApprovals());
  } catch {
    res.status(500).json({ error: "Failed to load approvals" });
  }
});

router.put("/operations/approvals/:id", async (req, res) => {
  try {
    const approval = await updateOpsApproval(parseInt(req.params.id), {
      status: req.body.status,
    });
    if (!approval) return res.status(404).json({ error: "Approval not found" });
    res.json(approval);
  } catch {
    res.status(500).json({ error: "Failed to update approval" });
  }
});

router.get("/agm/meetings", async (_req, res) => {
  try {
    res.json(await listAgmMeetings());
  } catch {
    res.status(500).json({ error: "Failed to load AGM meetings" });
  }
});

router.post("/agm/meetings", async (req, res) => {
  try {
    const meeting = await createAgmMeeting({
      title: req.body.title,
      company: req.body.company,
      meetingDate: req.body.meetingDate,
      venue: req.body.venue,
      status: req.body.status || "planning",
      agenda: req.body.agenda || "",
      quorumRequired: Number(req.body.quorumRequired) || 50,
      attendeesExpected: Number(req.body.attendeesExpected) || 0,
      attendeesPresent: Number(req.body.attendeesPresent) || 0,
      chair: req.body.chair || "",
      secretary: req.body.secretary || "",
      noticeStatus: req.body.noticeStatus || "not_sent",
      packStatus: req.body.packStatus || "draft",
      minutes: req.body.minutes || "",
      minutesStatus: req.body.minutesStatus || "pending",
    });
    res.status(201).json(meeting);
  } catch {
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

router.put("/agm/meetings/:id", async (req, res) => {
  try {
    const meeting = await updateAgmMeeting(parseInt(req.params.id), {
      status: req.body.status,
      venue: req.body.venue,
      agenda: req.body.agenda,
      noticeStatus: req.body.noticeStatus,
      noticeSentAt: req.body.noticeSentAt,
      packStatus: req.body.packStatus,
      minutes: req.body.minutes,
      minutesStatus: req.body.minutesStatus,
      attendeesPresent: req.body.attendeesPresent,
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    if (req.body.audit) {
      await recordGovernanceEvent({
        meetingId: meeting.id,
        actor: req.body.audit.actor || "System",
        action: req.body.audit.action,
        detail: req.body.audit.detail,
      });
    }
    res.json(meeting);
  } catch {
    res.status(500).json({ error: "Failed to update meeting" });
  }
});

router.get("/agm/meetings/:id/workspace", async (req, res) => {
  try {
    const workspace = await getAgmWorkspace(parseInt(req.params.id));
    if (!workspace) return res.status(404).json({ error: "Meeting not found" });
    res.json(workspace);
  } catch {
    res.status(500).json({ error: "Failed to load AGM workspace" });
  }
});

router.get("/agm/resolutions", async (req, res) => {
  try {
    const meetingId = typeof req.query.meetingId === "string" ? parseInt(req.query.meetingId) : undefined;
    res.json(await listAgmResolutions(Number.isNaN(meetingId) ? undefined : meetingId));
  } catch {
    res.status(500).json({ error: "Failed to load resolutions" });
  }
});

router.post("/agm/resolutions", async (req, res) => {
  try {
    const resolution = await createAgmResolution({
      meetingId: Number(req.body.meetingId),
      title: req.body.title,
      description: req.body.description || "",
      status: req.body.status || "draft",
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
    });
    res.status(201).json(resolution);
  } catch {
    res.status(500).json({ error: "Failed to create resolution" });
  }
});

router.post("/agm/resolutions/:id/vote", async (req, res) => {
  try {
    const choice = req.body.choice as "for" | "against" | "abstain";
    if (!["for", "against", "abstain"].includes(choice)) {
      return res.status(400).json({ error: "Vote must be for, against, or abstain" });
    }
    const resolution = await voteOnResolution(parseInt(req.params.id), choice);
    if (!resolution) return res.status(404).json({ error: "Resolution not found" });
    await recordGovernanceEvent({
      meetingId: resolution.meetingId,
      actor: req.body.actor || "Member",
      action: "Recorded vote",
      detail: `Voted ${choice} on “${resolution.title}”.`,
    });
    res.json(resolution);
  } catch {
    res.status(500).json({ error: "Failed to record vote" });
  }
});

router.put("/agm/resolutions/:id", async (req, res) => {
  try {
    const resolution = await updateAgmResolution(parseInt(req.params.id), {
      status: req.body.status,
    });
    if (!resolution) return res.status(404).json({ error: "Resolution not found" });
    res.json(resolution);
  } catch {
    res.status(500).json({ error: "Failed to update resolution" });
  }
});

router.put("/agm/documents/:id", async (req, res) => {
  try {
    const document = await updateAgmDocument(parseInt(req.params.id), { status: req.body.status });
    if (!document) return res.status(404).json({ error: "Document not found" });
    res.json(document);
  } catch {
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.put("/agm/attendees/:id", async (req, res) => {
  try {
    const attendee = await updateAgmAttendee(parseInt(req.params.id), { status: req.body.status });
    if (!attendee) return res.status(404).json({ error: "Attendee not found" });
    res.json(attendee);
  } catch {
    res.status(500).json({ error: "Failed to update attendee" });
  }
});

router.get("/agm/actions", async (req, res) => {
  try {
    const meetingId = typeof req.query.meetingId === "string" ? parseInt(req.query.meetingId) : undefined;
    res.json(await listAgmActions(Number.isNaN(meetingId) ? undefined : meetingId));
  } catch {
    res.status(500).json({ error: "Failed to load actions" });
  }
});

router.post("/agm/actions", async (req, res) => {
  try {
    const action = await createAgmAction({
      meetingId: Number(req.body.meetingId),
      title: req.body.title,
      owner: req.body.owner || "Unassigned",
      dueDate: req.body.dueDate,
      status: req.body.status || "open",
      source: req.body.source || "Action tracking",
    });
    res.status(201).json(action);
  } catch {
    res.status(500).json({ error: "Failed to create action" });
  }
});

router.put("/agm/actions/:id", async (req, res) => {
  try {
    const action = await updateAgmAction(parseInt(req.params.id), { status: req.body.status });
    if (!action) return res.status(404).json({ error: "Action not found" });
    res.json(action);
  } catch {
    res.status(500).json({ error: "Failed to update action" });
  }
});

router.get("/playbooks", async (_req, res) => {
  try {
    res.json(await listPlaybooks());
  } catch {
    res.status(500).json({ error: "Failed to load playbooks" });
  }
});

router.post("/playbooks", async (req, res) => {
  try {
    const steps = typeof req.body.steps === "string"
      ? req.body.steps.split("\n").map((step: string) => step.trim()).filter(Boolean)
      : req.body.steps || [];
    const playbook = await createPlaybook({
      name: req.body.name,
      category: req.body.category || "Operations",
      ownerId: Number(req.body.ownerId) || 1,
      status: req.body.status || "draft",
      steps,
      estimatedMinutes: Number(req.body.estimatedMinutes) || 60,
    });
    res.status(201).json(playbook);
  } catch {
    res.status(500).json({ error: "Failed to create playbook" });
  }
});

router.get("/time-logs", async (_req, res) => {
  try {
    res.json(await listTimeLogs());
  } catch {
    res.status(500).json({ error: "Failed to load time logs" });
  }
});

router.post("/time-logs", async (req, res) => {
  try {
    const log = await createTimeLog({
      playbookId: Number(req.body.playbookId),
      userId: Number(req.body.userId) || 1,
      activity: req.body.activity,
      minutes: Number(req.body.minutes) || 0,
      notes: req.body.notes || null,
    });
    res.status(201).json(log);
  } catch {
    res.status(500).json({ error: "Failed to log time" });
  }
});
router.get("/agm/engagements", async (_req, res) => {
  try {
    res.json(await listAgmEngagements());
  } catch {
    res.status(500).json({ error: "Failed to load AGM requests" });
  }
});

router.get("/agm/engagements/summary", async (_req, res) => {
  try {
    res.json(await getAgmEngagementsSummary());
  } catch {
    res.status(500).json({ error: "Failed to load AGM report" });
  }
});

router.get("/agm/engagements/:id", async (req, res) => {
  try {
    const engagement = await getAgmEngagementById(parseInt(req.params.id));
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to load AGM request" });
  }
});

router.post("/agm/engagements", async (req, res) => {
  try {
    const engagement = await createAgmEngagement({
      clientCompany: req.body.clientCompany,
      contactName: req.body.contactName,
      contactEmail: req.body.contactEmail,
      submittedBy: req.body.submittedBy,
      meetingFormat: req.body.meetingFormat === "virtual" ? "virtual" : "physical",
      meetingDate: req.body.meetingDate,
      meetingTime: req.body.meetingTime,
      venue: req.body.venue,
      meetingLink: req.body.meetingLink,
      meetingPassword: req.body.meetingPassword,
      notes: req.body.notes,
    });
    res.status(201).json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to log AGM request" });
  }
});

router.post("/agm/engagements/:id/log", async (req, res) => {
  try {
    const engagement = await confirmAgmEngagementLogged(parseInt(req.params.id), req.body.actor || "Admin");
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to log the request into the system" });
  }
});

router.post("/agm/engagements/:id/venue-inspection", async (req, res) => {
  try {
    const notified = Array.isArray(req.body.notified) ? req.body.notified.filter(Boolean) : [];
    const engagement = await initiateAgmVenueInspection(parseInt(req.params.id), req.body.actor || "Admin", notified, req.body.notes);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to initiate the venue inspection" });
  }
});

router.post("/agm/engagements/:id/venue-inspection/complete", async (req, res) => {
  try {
    const engagement = await completeAgmVenueInspection(parseInt(req.params.id), req.body.actor || "Admin", req.body.notes);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to complete the venue inspection" });
  }
});

router.post("/agm/engagements/:id/dividend", async (req, res) => {
  try {
    const position = ["defaulting", "proposing", "none"].includes(req.body.position) ? req.body.position : "none";
    const engagement = await setAgmDividendPosition(parseInt(req.params.id), req.body.actor || "Admin", position, req.body.notes);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to update the dividend position" });
  }
});

router.post("/agm/engagements/:id/notify-departments", async (req, res) => {
  try {
    const departments = Array.isArray(req.body.departments) ? req.body.departments.filter(Boolean) : [];
    const engagement = await notifyAgmDepartments(parseInt(req.params.id), req.body.actor || "Admin", departments);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to notify departments" });
  }
});

router.post("/agm/engagements/:id/demand-notice", async (req, res) => {
  try {
    const engagement = await sendAgmDemandNotice(parseInt(req.params.id), req.body.actor || "Accounts", {
      designatedAccount: req.body.designatedAccount || "",
      preparedBy: req.body.preparedBy || "",
      sentBy: req.body.sentBy || "",
      senderEmail: req.body.senderEmail || "",
    });
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to send the demand notice" });
  }
});

router.post("/agm/engagements/:id/it-briefing", async (req, res) => {
  try {
    const engagement = await requestAgmItBriefing(parseInt(req.params.id), req.body.actor || "Admin");
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to request the IT briefing" });
  }
});

router.post("/agm/engagements/:id/staff", async (req, res) => {
  try {
    const staff = Array.isArray(req.body.staff)
      ? req.body.staff
          .filter((member: { name?: string }) => member && member.name)
          .map((member: { name: string; email?: string; role?: string }) => ({
            name: member.name,
            email: member.email || "",
            role: member.role || "",
          }))
      : [];
    const engagement = await assignAgmStaff(parseInt(req.params.id), req.body.actor || "Admin", staff);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to assign staff" });
  }
});

router.post("/agm/engagements/:id/items", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items.filter(Boolean) : [];
    const approvers = Array.isArray(req.body.approvers) ? req.body.approvers.filter(Boolean) : [];
    const engagement = await submitAgmItemsRequired(parseInt(req.params.id), req.body.actor || "IT", items, approvers);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to submit the item list" });
  }
});

router.post("/agm/engagements/:id/approval", async (req, res) => {
  try {
    const decision = req.body.decision === "rejected" ? "rejected" : "approved";
    const engagement = await decideAgmApproval(parseInt(req.params.id), req.body.actor || "Approver", decision, req.body.reason);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to record the decision" });
  }
});

router.post("/agm/engagements/:id/logistics", async (req, res) => {
  try {
    const recipients = Array.isArray(req.body.recipients) ? req.body.recipients.filter(Boolean) : [];
    const engagement = await sendAgmLogisticsPack(parseInt(req.params.id), req.body.actor || "Logistics", recipients);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to send the logistics pack" });
  }
});

router.post("/agm/engagements/:id/proxy", async (req, res) => {
  try {
    const status = req.body.status === "completed" ? "completed" : "in_progress";
    const engagement = await recordAgmProxyCapture(parseInt(req.params.id), req.body.actor || "Admin", Number(req.body.capturedCount) || 0, status);
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to record proxy capture" });
  }
});

router.post("/agm/engagements/:id/send-to-board", async (req, res) => {
  try {
    const engagement = await linkAgmEngagementToMeeting(parseInt(req.params.id), req.body.actor || "Admin");
    if (!engagement) return res.status(404).json({ error: "AGM request not found" });
    res.json(engagement);
  } catch {
    res.status(500).json({ error: "Failed to send the AGM to the board" });
  }
});

export default router;
