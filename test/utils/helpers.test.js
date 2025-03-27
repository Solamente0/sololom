/**
 * Tests for the helpers utility functions
 */

import * as helpers from "../../src/utils/helpers";

describe("helpers utility functions", () => {
  describe("generateUUID", () => {
    it("should generate a valid UUID", () => {
      const uuid = helpers.generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe("string");
      expect(uuid.length).toBe(36);
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique UUIDs", () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(helpers.generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe("debounce", () => {
    jest.useFakeTimers();

    it("should debounce a function call", () => {
      const mockFn = jest.fn();
      const debouncedFn = helpers.debounce(mockFn, 500);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(400);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should call the function only once when called multiple times within the wait period", () => {
      const mockFn = jest.fn();
      const debouncedFn = helpers.debounce(mockFn, 500);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should reset the timer when called again within the wait period", () => {
      const mockFn = jest.fn();
      const debouncedFn = helpers.debounce(mockFn, 500);

      debouncedFn();

      jest.advanceTimersByTime(400);
      expect(mockFn).not.toHaveBeenCalled();

      debouncedFn(); // Reset the timer

      jest.advanceTimersByTime(400);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("formatDate", () => {
    const testDate = new Date("2023-06-15T12:30:45");

    beforeAll(() => {
      // Mock toLocaleDateString and toLocaleTimeString to return consistent values
      Date.prototype.toLocaleDateString = jest.fn(() => "6/15/2023");
      Date.prototype.toLocaleTimeString = jest.fn(() => "12:30 PM");
      Date.prototype.toLocaleString = jest.fn(() => "6/15/2023, 12:30 PM");
    });

    it("should format date in short format by default", () => {
      const formattedDate = helpers.formatDate(testDate);
      expect(formattedDate).toBe("6/15/2023");
    });

    it("should format date in different formats based on options", () => {
      expect(helpers.formatDate(testDate, { format: "long" })).toBe(
        "6/15/2023"
      );
      expect(helpers.formatDate(testDate, { format: "time" })).toBe("12:30 PM");
      expect(helpers.formatDate(testDate, { format: "datetime" })).toBe(
        "6/15/2023 12:30 PM"
      );
    });

    it("should handle timestamp input", () => {
      const timestamp = testDate.getTime();
      expect(helpers.formatDate(timestamp)).toBe("6/15/2023");
    });

    it("should format relative dates when relative option is true", () => {
      // Mock Date.now to return a fixed value
      const now = new Date("2023-06-15T14:30:45").getTime(); // 2 hours later
      const originalNow = Date.now;
      Date.now = jest.fn(() => now);

      expect(helpers.formatDate(testDate, { relative: true })).toBe(
        "2 hours ago"
      );

      // Test different time differences
      const justNow = new Date(now - 30 * 1000); // 30 seconds ago
      expect(helpers.formatDate(justNow, { relative: true })).toBe("just now");

      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
      expect(helpers.formatDate(fiveMinutesAgo, { relative: true })).toBe(
        "5 minutes ago"
      );

      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      expect(helpers.formatDate(oneDayAgo, { relative: true })).toBe(
        "1 day ago"
      );

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe("truncateString", () => {
    it("should truncate a string if it exceeds maxLength", () => {
      const longString = "This is a long string that needs to be truncated";
      expect(helpers.truncateString(longString, 20)).toBe(
        "This is a long st..."
      );
    });

    it("should not truncate a string if it is shorter than maxLength", () => {
      const shortString = "Short string";
      expect(helpers.truncateString(shortString, 20)).toBe(shortString);
    });

    it("should return empty string for null or undefined input", () => {
      expect(helpers.truncateString(null, 10)).toBe("");
      expect(helpers.truncateString(undefined, 10)).toBe("");
    });
  });

  describe("slugify", () => {
    it("should convert a string to a slug", () => {
      expect(helpers.slugify("Hello World")).toBe("hello-world");
      expect(helpers.slugify("This is a test!")).toBe("this-is-a-test");
      expect(helpers.slugify("  Trim  spaces  ")).toBe("trim-spaces");
    });

    it("should remove special characters", () => {
      expect(helpers.slugify("Special @#$%^&*() characters")).toBe(
        "special-characters"
      );
    });

    it("should convert to lowercase", () => {
      expect(helpers.slugify("UPPERCASE")).toBe("uppercase");
    });

    it("should replace multiple hyphens with a single hyphen", () => {
      expect(helpers.slugify("multiple---hyphens")).toBe("multiple-hyphens");
    });
  });

  describe("getModelDisplayName", () => {
    it("should return a display name for known models", () => {
      expect(helpers.getModelDisplayName("gpt-3.5-turbo")).toBe(
        "GPT-3.5 Turbo"
      );
      expect(helpers.getModelDisplayName("claude-3-opus")).toBe(
        "Claude 3 Opus"
      );
    });

    it("should return the original model ID for unknown models", () => {
      const unknownModel = "unknown-model";
      expect(helpers.getModelDisplayName(unknownModel)).toBe(unknownModel);
    });
  });

  describe("getProviderFromModel", () => {
    it("should determine the correct provider from model name", () => {
      expect(helpers.getProviderFromModel("gpt-3.5-turbo")).toBe("openai");
      expect(helpers.getProviderFromModel("gpt-4")).toBe("openai");
      expect(helpers.getProviderFromModel("claude-2.1")).toBe("anthropic");
      expect(helpers.getProviderFromModel("claude-3-opus")).toBe("anthropic");
      expect(helpers.getProviderFromModel("mistral-small")).toBe("mistral");
    });

    it('should return "unknown" for unrecognized models', () => {
      expect(helpers.getProviderFromModel("unknown-model")).toBe("unknown");
    });
  });

  describe("renderMarkdown", () => {
    it("should convert markdown to HTML", () => {
      const markdown =
        "# Heading\n\nThis is a **bold** text with *italic* and `code`.";
      const html = helpers.renderMarkdown(markdown);

      expect(html).toContain("<h1>Heading</h1>");
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain("<code>code</code>");
    });

    it("should handle code blocks", () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      const html = helpers.renderMarkdown(markdown);

      expect(html).toContain("<pre><code>const x = 1;\n</code></pre>");
    });

    it("should handle links", () => {
      const markdown = "[Link text](https://example.com)";
      const html = helpers.renderMarkdown(markdown);

      expect(html).toContain(
        '<a href="https://example.com" target="_blank">Link text</a>'
      );
    });

    it("should handle empty input", () => {
      expect(helpers.renderMarkdown("")).toBe("");
      expect(helpers.renderMarkdown(null)).toBe("");
      expect(helpers.renderMarkdown(undefined)).toBe("");
    });
  });
});
