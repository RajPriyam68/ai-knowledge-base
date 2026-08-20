import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  chatSchema,
  createKbSchema,
  documentTaskSchema,
  idParamSchema,
  loginSchema,
  registerSchema,
  searchSchema,
} from "../../src/validators/index.js";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const r = registerSchema.safeParse({ email: "a@b.com", password: "Password1", name: "Alice" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ email: "nope", password: "Password1", name: "A" }).success).toBe(false);
  });

  it("rejects weak password", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "short", name: "A" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "Password1", name: "  " }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "x" }).success).toBe(false);
  });
});

describe("chatSchema", () => {
  it("requires a question", () => {
    expect(chatSchema.safeParse({ question: "  " }).success).toBe(false);
    expect(chatSchema.safeParse({ question: "hi" }).success).toBe(true);
  });

  it("validates uuid fields", () => {
    expect(
      chatSchema.safeParse({ question: "hi", kbId: "not-a-uuid", chatId: "also-not" }).success,
    ).toBe(false);
    expect(
      chatSchema.safeParse({
        question: "hi",
        kbId: "80367f1d-3558-4c2c-9735-98688c496d7e",
        chatId: "80367f1d-3558-4c2c-9735-98688c496d7e",
      }).success,
    ).toBe(true);
  });

  it("caps documentIds at 20", () => {
    const ids = Array.from({ length: 21 }, () => "80367f1d-3558-4c2c-9735-98688c496d7e");
    expect(chatSchema.safeParse({ question: "hi", documentIds: ids }).success).toBe(false);
  });
});

describe("idParamSchema", () => {
  it("accepts only uuids", () => {
    expect(idParamSchema.safeParse({ id: "80367f1d-3558-4c2c-9735-98688c496d7e" }).success).toBe(true);
    expect(idParamSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

describe("createKbSchema", () => {
  it("requires a name", () => {
    expect(createKbSchema.safeParse({}).success).toBe(false);
    expect(createKbSchema.safeParse({ name: "KB" }).success).toBe(true);
  });
});

describe("documentTaskSchema", () => {
  it("only allows known tasks", () => {
    for (const task of ["summarize", "keypoints", "flashcards", "quiz"]) {
      expect(documentTaskSchema.safeParse({ task }).success).toBe(true);
    }
    expect(documentTaskSchema.safeParse({ task: "hack" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires current and new password", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "Password1" }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short" }).success).toBe(false);
  });
});

describe("searchSchema", () => {
  it("coerces page numbers", () => {
    const r = searchSchema.safeParse({ page: "2", pageSize: "50" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.pageSize).toBe(50);
    }
  });

  it("applies defaults", () => {
    const r = searchSchema.safeParse({});
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.pageSize).toBe(20);
    }
  });
});
