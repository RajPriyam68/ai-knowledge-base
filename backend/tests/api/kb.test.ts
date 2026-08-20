import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();
const MOCK_UUID = "00000000-0000-4000-8000-000000000000";

describe("knowledge base + document + chat flow", () => {
  let accessToken: string;
  let kbId: string;
  let docId: string;
  const kbName = `Test KB ${Date.now().toString(36)}`;

  beforeAll(async () => {
    const stamp = Date.now().toString(36);
    const reg = await request(app).post("/api/auth/register").send({
      email: `kb+${stamp}@example.com`,
      password: "KbPassword123",
      name: "KB Tester",
    });
    accessToken = reg.body.data.accessToken;
  });

  it("lists knowledge bases", async () => {
    const res = await request(app).get("/api/kb").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("creates a knowledge base", async () => {
    const res = await request(app)
      .post("/api/kb")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: kbName, description: "for API tests" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(kbName);
    kbId = res.body.data.id;
  });

  it("rejects a KB with no name", async () => {
    const res = await request(app)
      .post("/api/kb")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it("gets KB details", async () => {
    const res = await request(app).get(`/api/kb/${kbId}`).set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(kbId);
  });

  it("uploads a markdown document", async () => {
    const res = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("kbId", kbId)
      .attach("files", Buffer.from("# Hello\n\nPostgreSQL is a relational database."), "hello.md");
    expect(res.status).toBe(201);
    expect(res.body.data.uploaded.length).toBe(1);
    docId = res.body.data.uploaded[0].id;
  });

  it("rejects uploads of unsupported file types", async () => {
    const res = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("kbId", kbId)
      .attach("files", Buffer.from("evil"), "evil.exe");
    expect(res.status).toBe(415);
  });

  it("lists documents", async () => {
    const res = await request(app)
      .get(`/api/documents?kbId=${kbId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it("renames a document", async () => {
    const res = await request(app)
      .put(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "renamed.md" });
    expect(res.status).toBe(200);
    expect(res.body.data.originalName).toBe("renamed.md");
  });

  it("summarizes a document (offline demo mode)", async () => {
    let status = "PENDING";
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const list = await request(app)
        .get(`/api/documents?kbId=${kbId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      const doc = list.body.data.items.find((d: { id: string }) => d.id === docId);
      status = doc?.status;
      if (status === "PROCESSED" || status === "FAILED") break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    expect(status).toBe("PROCESSED");

    const res = await request(app)
      .post(`/api/chat/documents/${docId}/summarize`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.text).toContain("Summary");
  });

  it("runs a RAG chat and returns citations", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ question: "What is PostgreSQL?", kbId });
    expect(res.status).toBe(201);
    expect(res.body.data.answer).toBeTruthy();
    expect(Array.isArray(res.body.data.citations)).toBe(true);
  });

  it("exports chat history as markdown", async () => {
    const chats = await request(app)
      .get("/api/chat/history")
      .set("Authorization", `Bearer ${accessToken}`);
    const chatId = chats.body.data.items[0]?.id;
    expect(chatId).toBeTruthy();
    const res = await request(app)
      .get(`/api/chat/export/${chatId}?format=markdown`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/markdown");
    expect(res.text).toContain("What is PostgreSQL?");
  });

  it("exports chat history as pdf", async () => {
    const chats = await request(app)
      .get("/api/chat/history")
      .set("Authorization", `Bearer ${accessToken}`);
    const chatId = chats.body.data.items[0]?.id;
    const res = await request(app)
      .get(`/api/chat/export/${chatId}?format=pdf`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.body.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("rejects a chat to a KB the user does not own", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: `other+${Date.now().toString(36)}@example.com`,
      password: "OtherPass123",
      name: "Other",
    });
    const otherToken = other.body.data.accessToken;
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ question: "hi", kbId });
    expect(res.status).toBe(404);
  });

  it("rejects a chat with an invalid kbId", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ question: "hi", kbId: MOCK_UUID });
    expect(res.status).toBe(404);
  });

  it("deletes a document", async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it("deletes a knowledge base", async () => {
    const res = await request(app).delete(`/api/kb/${kbId}`).set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});
