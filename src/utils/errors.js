// Centralized API error helpers
// Provides AppError and convenience factories for common HTTP errors

export class AppError extends Error {
  constructor(message, status = 500, code = null, details = null) {
    super(message || "Internal Server Error");
    this.name = "AppError";
    this.status = Number(status) || 500;
    this.code = code || codeFromStatus(this.status);
    this.details = details || null;
    // Ensure proper stack in V8
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
}

export function codeFromStatus(status) {
  switch (Number(status)) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      if (status >= 500) return "INTERNAL_ERROR";
      return "ERROR";
  }
}

// Factory helpers
export const BadRequest = (msg = "Bad Request", details = null) =>
  new AppError(msg, 400, "BAD_REQUEST", details);
export const Unauthorized = (msg = "Unauthorized", details = null) =>
  new AppError(msg, 401, "UNAUTHORIZED", details);
export const Forbidden = (msg = "Forbidden", details = null) =>
  new AppError(msg, 403, "FORBIDDEN", details);
export const NotFound = (msg = "Not Found", details = null) =>
  new AppError(msg, 404, "NOT_FOUND", details);
export const Conflict = (msg = "Conflict", details = null) =>
  new AppError(msg, 409, "CONFLICT", details);
export const Unprocessable = (msg = "Unprocessable Entity", details = null) =>
  new AppError(msg, 422, "UNPROCESSABLE_ENTITY", details);
export const TooManyRequests = (msg = "Too Many Requests", details = null) =>
  new AppError(msg, 429, "TOO_MANY_REQUESTS", details);
export const Internal = (msg = "Internal Server Error", details = null) =>
  new AppError(msg, 500, "INTERNAL_ERROR", details);
