import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { permissionService } from "../src/modules/permissions/permission.service";
import { generateToken } from "../src/utils/jwt";

const url = new URL(process.env.DATABASE_URL || "postgresql://localhost/disabled");
const isolated = ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/hr_recruitment_qa_ui_");
const suite = isolated ? describe : describe.skip;

suite("organised recruitment flow in an isolated database", () => {
  jest.setTimeout(30000);
  const tokens: Record<string, string> = {};
  let departmentId: string;
  let panelId: string;
  const api = (role: string) => ({
    post: (path: string, body: any) => request(app).post("/api/recruitment" + path).set("Authorization", `Bearer ${tokens[role]}`).send(body),
    put: (path: string, body: any) => request(app).put("/api/recruitment" + path).set("Authorization", `Bearer ${tokens[role]}`).send(body),
    get: (path: string) => request(app).get("/api/recruitment" + path).set("Authorization", `Bearer ${tokens[role]}`),
  });
  beforeAll(async () => {
    await permissionService.ensureDefaults();
    const runId = Date.now();
    departmentId = (await prisma.department.create({ data: { name: `UI Flow QA ${runId}` } })).id;
    for (const role of ["HR", "MANAGER", "EMPLOYEE"] as const) {
      const employee = await prisma.employee.create({ data: { employeeCode: `UI-${role}-${runId}`, firstName: "UI", lastName: role, email: `${role.toLowerCase()}-${runId}@ui-flow.test`, designation: role, joiningDate: new Date(), departmentId } });
      const user = await prisma.user.create({ data: { email: employee.email, password: "test-token-only", role, employeeId: employee.id } });
      tokens[role] = generateToken({ userId: user.id, email: user.email, role, employeeId: employee.id, tokenVersion: user.tokenVersion });
      if (role === "MANAGER") panelId = employee.id;
    }
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("schedules, reschedules, submits feedback and shows it read-only on the next round's card", async () => {
    const opening = await api("HR").post("/requisitions", { positionTitle: "UI Flow QA", departmentId, location: "Test office", numberOfVacancies: 3 });
    expect(opening.status).toBe(200);
    const requisitionId = opening.body.data.id;
    const created = await api("HR").post("/candidates", { candidateName: "Test Applicant", email: "applicant@ui-flow.test", mobile: "9999999999", qualification: "B.Tech", totalExperience: 1, currentSalary: 12345, requisitionId });
    expect(created.status).toBe(200);
    expect(created.body.data.noticePeriod).toBeNull();
    const candidateId = created.body.data.id;
    const schedule = { round: "HR_INTERVIEW", startsAt: "2030-01-02T09:00:00Z", endsAt: "2030-01-02T10:00:00Z", timezone: "Asia/Kolkata", mode: "IN_PERSON", location: "Test office", interviewerId: panelId };
    const hr = await api("HR").post(`/candidates/${candidateId}/interviews`, schedule);
    expect(hr.status).toBe(200);
    const moved = await api("HR").put(`/interviews/${hr.body.data.id}/schedule`, { ...schedule, startsAt: "2030-01-02T10:00:00Z", endsAt: "2030-01-02T11:00:00Z", reason: "Panel availability" });
    expect(moved.status).toBe(200);
    const hrId = moved.body.data.id;
    expect((await prisma.interview.findUniqueOrThrow({ where: { id: hr.body.data.id } })).status).toBe("CANCELLED");
    expect((await api("HR").put(`/interviews/${hrId}/status`, { status: "COMPLETED" })).status).toBe(200);
    expect((await api("HR").put(`/interviews/${hrId}/feedback`, { draft: true, feedback: "Private draft" })).status).toBe(200);
    expect((await prisma.interview.findUniqueOrThrow({ where: { id: hrId } })).feedbackSubmittedAt).toBeNull();
    expect((await api("HR").put(`/interviews/${hrId}/feedback`, { feedback: "Communicates clearly; follow up on technical depth", score: 7, recommendation: "YES" })).status).toBe(200);
    const technical = await api("HR").post(`/candidates/${candidateId}/interviews`, { ...schedule, round: "TECHNICAL", startsAt: "2030-01-03T09:00:00Z", endsAt: "2030-01-03T10:00:00Z" });
    expect(technical.status).toBe(200);
    await prisma.modulePermission.update({ where: { role_module: { role: "MANAGER", module: "recruitment" } }, data: { canView: true, canEdit: false, canViewRestricted: false } });
    const calendar = await api("MANAGER").get("/interviews");
    expect(calendar.status).toBe(200);
    const scheduled = calendar.body.data.find((item: any) => item.interviewId === technical.body.data.id);
    expect(scheduled.previousRoundFeedback).toMatchObject({ state: "available", round: "HR_INTERVIEW", interviewId: hrId, reviewerName: "UI HR", feedback: "Communicates clearly; follow up on technical depth", score: 7 });
    expect(scheduled.previousRoundFeedback).not.toHaveProperty("draftFeedback");
    expect(scheduled).not.toHaveProperty("currentSalary");
    expect((await api("MANAGER").put(`/interviews/${hrId}/feedback`, { feedback: "Unauthorized correction", revisionReason: "Not permitted" })).status).toBe(403);
    const details = await api("HR").get(`/requisitions/${requisitionId}/candidates`);
    expect(details.body.data[0].interviews.find((item: any) => item.id === technical.body.data.id).previousRoundFeedback.interviewId).toBe(hrId);
    const duplicate = await api("HR").post("/candidates", { candidateName: "Conflict Applicant", requisitionId });
    expect((await api("HR").post(`/candidates/${duplicate.body.data.id}/interviews`, { ...schedule, startsAt: "2030-01-03T09:00:00Z", endsAt: "2030-01-03T10:00:00Z" })).status).toBe(400);
    expect((await request(app).get("/api/recruitment/interviews")).status).toBe(401);
    expect((await api("EMPLOYEE").get("/interviews")).status).toBe(403);
  });
});
