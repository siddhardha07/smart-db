import {
  ValidationError,
  DatabaseError,
  ParsingError,
  createSuccessResponse,
  createErrorResponse,
} from "../src/utils/errors"; // Adjust path based on your folder structure

describe("Custom Error Classes", () => {
  test("ValidationError should set correct name and message", () => {
    const error = new ValidationError("Invalid input");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Invalid input");
  });

  test("DatabaseError should set correct name, message, and originalError", () => {
    const original = new Error("Connection failed");
    const error = new DatabaseError("DB operation failed", original);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DatabaseError");
    expect(error.message).toBe("DB operation failed");
    expect(error.originalError).toBe(original);
  });

  test("ParsingError should set correct name and message", () => {
    const error = new ParsingError("JSON parsing failed");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ParsingError");
    expect(error.message).toBe("JSON parsing failed");
  });
});

describe("API Response Helpers", () => {
  test("createSuccessResponse should return success = true with data", () => {
    const data = { id: 1, name: "Siddhartha" };
    const result = createSuccessResponse(data);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.message).toBeUndefined();
  });

  test("createSuccessResponse should include message when provided", () => {
    const data = { status: "ok" };
    const message = "Operation successful";
    const result = createSuccessResponse(data, message);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.message).toBe(message);
  });

  test("createErrorResponse should return success = false with error message", () => {
    const error = "Something went wrong";
    const result = createErrorResponse(error);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.details).toBeUndefined();
  });

  test("createErrorResponse should include details when provided", () => {
    const error = "Database error";
    const details = "Connection timeout";
    const result = createErrorResponse(error, details);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.details).toBe(details);
  });
});
