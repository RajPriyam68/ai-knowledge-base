import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("GET /api/health", () => {
  it("returns ok with status 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("ok");
    expect(res.body.service).toBe("ai-knowledge-base-api");
  });
});

describe("not found handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("auth flow", () => {
  let registeredUser: { email: string; password: string; name: string };
  let accessToken: string;
  let refreshToken: string;

  beforeAll(() => {
    const stamp = Date.now().toString(36);
    registeredUser = {
      email: `test+${stamp}@example.com`,
      password: "TestPassword123",
      name: "Test User",
    };
  });

  it("register creates a user and returns tokens", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(registeredUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(registeredUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it("register rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(registeredUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("register rejects weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: `bad+${Date.now()}@example.com`, password: "short", name: "X" });
    expect(res.status).toBe(422);
  });

  it("GET /api/auth/me returns the profile", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(registeredUser.email);
  });

  it("GET /api/auth/me rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("login succeeds with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: registeredUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("login fails with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: registeredUser.email, password: "WrongPassword123" });
    expect(res.status).toBe(401);
  });

  it("refresh rotates the refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
    refreshToken = res.body.data.refreshToken;
  });

  it("refresh rejects an invalid token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "garbage" });
    expect(res.status).toBe(401);
  });

  it("logout revokes the session", async () => {
    const res = await request(app).post("/api/auth/logout").send({ refreshToken });
    expect(res.status).toBe(200);
    const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshed.status).toBe(401);
  });
});
