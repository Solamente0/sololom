/**
 * Tests for the error handler utility functions
 */

import * as errorHandler from "@/utils/errorHandler";

describe("errorHandler utility functions", () => {
  describe("handleApiError", () => {
    it("should return user-friendly messages for OpenAI API errors", () => {
      const insufficientQuotaError = new Error(
        "OpenAI API Error: insufficient_quota"
      );
      expect(errorHandler.handleApiError(insufficientQuotaError)).toBe(
        "Your OpenAI API key has insufficient quota. Please check your billing status."
      );

      const invalidApiKeyError = new Error("OpenAI API Error: invalid_api_key");
      expect(errorHandler.handleApiError(invalidApiKeyError)).toBe(
        "Invalid OpenAI API key. Please check your settings."
      );

      const rateLimitError = new Error("OpenAI API Error: rate_limit_exceeded");
      expect(errorHandler.handleApiError(rateLimitError)).toBe(
        "OpenAI rate limit exceeded. Please try again later."
      );
    });

    it("should return user-friendly messages for Anthropic API errors", () => {
      const invalidApiKeyError = new Error(
        "Anthropic API Error: invalid_api_key"
      );
      expect(errorHandler.handleApiError(invalidApiKeyError)).toBe(
        "Invalid Anthropic API key. Please check your settings."
      );

      const permissionError = new Error(
        "Anthropic API Error: permission_error"
      );
      expect(errorHandler.handleApiError(permissionError)).toBe(
        "Your Anthropic API key does not have permission to use this model."
      );
    });

    it("should return user-friendly messages for Mistral API errors", () => {
      const invalidApiKeyError = new Error(
        "Mistral API Error: invalid_api_key"
      );
      expect(errorHandler.handleApiError(invalidApiKeyError)).toBe(
        "Invalid Mistral API key. Please check your settings."
      );

      const rateLimitError = new Error(
        "Mistral API Error: rate_limit_exceeded"
      );
      expect(errorHandler.handleApiError(rateLimitError)).toBe(
        "Mistral rate limit exceeded. Please try again later."
      );
    });

    it("should handle network errors", () => {
      const networkError = new Error("Failed to fetch");
      expect(errorHandler.handleApiError(networkError)).toBe(
        "Network error. Please check your internet connection."
      );
    });

    it("should return the original message for unrecognized API errors", () => {
      const unknownApiError = new Error("OpenAI API Error: unknown_error");
      expect(errorHandler.handleApiError(unknownApiError)).toBe(
        "OpenAI API Error: unknown_error"
      );
    });

    it("should return a generic message for errors without a message", () => {
      const emptyError = new Error();
      expect(errorHandler.handleApiError(emptyError)).toBe(
        "An unexpected error occurred."
      );
    });
  });

  describe("logError", () => {
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    it("should log errors to console with timestamp", () => {
      const error = new Error("Test error");
      errorHandler.logError(error);

      expect(console.error).toHaveBeenCalled();
      // The first argument should include a timestamp
      const firstArg = console.error.mock.calls[0][0];
      expect(firstArg).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/
      );
      // The second argument should be "Error:"
      expect(console.error.mock.calls[0][1]).toBe("Error:");
      // The third argument should be the error object
      expect(console.error.mock.calls[0][2]).toBe(error);
    });

    it("should include context if provided", () => {
      const error = new Error("Test error");
      const context = "TestFunction";
      errorHandler.logError(error, context);

      const firstArg = console.error.mock.calls[0][0];
      expect(firstArg).toMatch(/\[TestFunction\]/);
    });
  });

  describe("createErrorResponse", () => {
    it("should create a standardized error response object", () => {
      const message = "Test error message";
      const response = errorHandler.createErrorResponse(message);

      expect(response).toEqual({
        success: false,
        error: {
          code: 500,
          message,
          details: {},
        },
      });
    });

    it("should allow custom error code and details", () => {
      const message = "Not found";
      const code = 404;
      const details = { id: "123", resource: "user" };

      const response = errorHandler.createErrorResponse(message, code, details);

      expect(response).toEqual({
        success: false,
        error: {
          code,
          message,
          details,
        },
      });
    });
  });

  describe("withErrorHandling", () => {
    it("should wrap a function with error handling", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const wrappedFn = errorHandler.withErrorHandling(mockFn);

      const result = await wrappedFn("arg1", "arg2");

      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toBe("success");
    });

    it("should handle errors in the wrapped function", async () => {
      const error = new Error("Test error");
      const mockFn = jest.fn().mockRejectedValue(error);

      // Spy on logError to check if it's called
      jest.spyOn(errorHandler, "logError").mockImplementation(() => {});

      const wrappedFn = errorHandler.withErrorHandling(mockFn);
      const result = await wrappedFn();

      expect(mockFn).toHaveBeenCalled();
      expect(errorHandler.logError).toHaveBeenCalledWith(error, mockFn.name);
      expect(result).toEqual({
        success: false,
        error: {
          code: 500,
          message: "Test error",
          details: {},
        },
      });

      // Restore the original implementation
      errorHandler.logError.mockRestore();
    });

    it("should use custom error handler if provided", async () => {
      const error = new Error("Test error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const customErrorHandler = jest
        .fn()
        .mockReturnValue("custom error result");

      const wrappedFn = errorHandler.withErrorHandling(
        mockFn,
        customErrorHandler
      );
      const result = await wrappedFn("arg1");

      expect(mockFn).toHaveBeenCalledWith("arg1");
      expect(customErrorHandler).toHaveBeenCalledWith(error, "arg1");
      expect(result).toBe("custom error result");
    });
  });

  describe("reportError", () => {
    let originalConsoleError;

    beforeEach(() => {
      // Save original implementation
      originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock global showToast if not available
      if (typeof window !== "undefined" && !window.showToast) {
        window.showToast = jest.fn();
      }
    });

    afterEach(() => {
      // Restore original implementation
      console.error = originalConsoleError;

      // Clean up mock
      if (typeof window !== "undefined" && window.showToast) {
        delete window.showToast;
      }
    });

    it("should log errors to console by default", () => {
      const message = "Test error message";
      errorHandler.reportError(message);

      expect(console.error).toHaveBeenCalledWith("[ERROR] Test error message");
    });

    it("should not log to console if console option is false", () => {
      const message = "Test error message";
      errorHandler.reportError(message, "error", { console: false });

      expect(console.error).not.toHaveBeenCalled();
    });

    it("should create a basic toast if showToast is not available", () => {
      // Mock the necessary DOM methods
      const mockDoc = global.document;
      global.document = {
        getElementById: jest.fn().mockReturnValue(null),
        createElement: jest.fn((tag) => {
          const element = {
            id: "",
            className: "",
            textContent: "",
            style: {},
            appendChild: jest.fn(),
          };
          return element;
        }),
        body: {
          appendChild: jest.fn(),
        },
      };

      // Mock setTimeout
      jest.useFakeTimers();

      const message = "Test error message";
      errorHandler.reportError(message, "error", {
        toast: true,
        console: false,
      });

      // Check if the toast container is created
      expect(document.createElement).toHaveBeenCalledWith("div");
      expect(document.body.appendChild).toHaveBeenCalled();

      // Restore the original document
      global.document = mockDoc;
    });
  });
});
