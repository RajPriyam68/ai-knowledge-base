import { describe, expect, it } from "vitest";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "../../src/utils/errors.js";

describe("error classes", () => {
  it("AppError carries statusCode and code", () => {
    const err = new AppError(500, "boom", "BOOM", { detail: 1 });
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("BOOM");
    expect(err.details).toEqual({ detail: 1 });
    expect(err.message).toBe("boom");
    expect(err).toBeInstanceOf(Error);
  });

  const cases = [
    { ctor: NotFoundError, status: 404, code: "NOT_FOUND", message: "Resource not found" },
    { ctor: BadRequestError, status: 400, code: "BAD_REQUEST", message: "Bad request" },
    { ctor: UnauthorizedError, status: 401, code: "UNAUTHORIZED", message: "Authentication required" },
    { ctor: ForbiddenError, status: 403, code: "FORBIDDEN", message: "Forbidden" },
    { ctor: ConflictError, status: 409, code: "CONFLICT", message: "Conflict" },
    { ctor: ValidationError, status: 422, code: "VALIDATION_ERROR", message: "Validation failed" },
    { ctor: PayloadTooLargeError, status: 413, code: "PAYLOAD_TOO_LARGE", message: "File too large" },
    { ctor: UnsupportedMediaTypeError, status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported file type" },
    { ctor: RateLimitError, status: 429, code: "RATE_LIMITED", message: "Too many requests" },
  ];

  for (const { ctor, status, code, message } of cases) {
    it(`${ctor.name} has status ${status} and code ${code}`, () => {
      const err = new ctor();
      expect(err.statusCode).toBe(status);
      expect(err.code).toBe(code);
      expect(err.message).toBe(message);
    });
  }

  it("subclasses extend AppError", () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ValidationError()).toBeInstanceOf(AppError);
  });
});
