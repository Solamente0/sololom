/**
 * Tests for the MessageBubble component
 */

import MessageBubble from "@/components/MessageBubble";
import * as helpers from "@/utils/helpers";

// Mock the helpers module
jest.mock("@/utils/helpers", () => ({
  renderMarkdown: jest.fn((content) => `<p>${content}</p>`),
  showToast: jest.fn(),
}));

describe("MessageBubble Component", () => {
  // Mock navigator.clipboard
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = "";

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
  });

  describe("Rendering", () => {
    it("should render a user message correctly", () => {
      const options = {
        role: "user",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      expect(element.className).toContain("message-user");
      expect(element.innerHTML).toContain("Hello world");

      // User messages shouldn't have copy button
      const copyBtn = element.querySelector(".copy-message-btn");
      expect(copyBtn).toBeNull();
    });

    it("should render an assistant message with markdown and copy button", () => {
      const options = {
        role: "assistant",
        content: "Hello **world** with `code`",
      };

      helpers.renderMarkdown.mockReturnValueOnce(
        "<p>Hello <strong>world</strong> with <code>code</code></p>"
      );

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      expect(element.className).toContain("message-assistant");

      // Check that markdown was rendered
      expect(helpers.renderMarkdown).toHaveBeenCalledWith(
        "Hello **world** with `code`"
      );
      expect(element.innerHTML).toContain("<strong>world</strong>");
      expect(element.innerHTML).toContain("<code>code</code>");

      // Should have copy button
      const copyBtn = element.querySelector(".copy-message-btn");
      expect(copyBtn).not.toBeNull();
    });

    it("should not show copy button if enableCopy is false", () => {
      const options = {
        role: "assistant",
        content: "Hello world",
        enableCopy: false,
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Should not have copy button
      const copyBtn = element.querySelector(".copy-message-btn");
      expect(copyBtn).toBeNull();
    });
  });

  describe("Copy functionality", () => {
    it("should copy message content to clipboard when copy button is clicked", async () => {
      const options = {
        role: "assistant",
        content: "Hello world",
        onCopy: jest.fn(),
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Append to body to make querySelector work
      document.body.appendChild(element);

      // Find and click copy button
      const copyBtn = element.querySelector(".copy-message-btn");
      copyBtn.click();

      // Check that clipboard API was called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Hello world");

      // Check that onCopy callback was called
      expect(options.onCopy).toHaveBeenCalledWith("Hello world");

      // Wait for timeout to complete to avoid act warnings
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("should update button text after copying", async () => {
      const options = {
        role: "assistant",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Append to body
      document.body.appendChild(element);

      // Find and store original button text
      const copyBtn = element.querySelector(".copy-message-btn");
      const originalText = copyBtn.innerHTML;

      // Click the button
      copyBtn.click();

      // Check that button text changed
      expect(copyBtn.innerHTML).toContain("Copied");

      // Fast-forward timers to see text change back
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);
      jest.useRealTimers();

      // Check that button text is restored
      expect(copyBtn.innerHTML).toBe(originalText);
    });

    it("should handle clipboard errors", async () => {
      // Mock clipboard to throw an error
      navigator.clipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard error")
      );

      const options = {
        role: "assistant",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Append to body
      document.body.appendChild(element);

      // Find and click copy button
      const copyBtn = element.querySelector(".copy-message-btn");
      copyBtn.click();

      // Wait for rejection to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Button text should not have changed to "Copied"
      expect(copyBtn.innerHTML).not.toContain("Copied");
    });
  });

  describe("Content updates", () => {
    it("should update message content", () => {
      const options = {
        role: "user",
        content: "Original content",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Initial content check
      expect(element.innerHTML).toContain("Original content");

      // Update content
      messageBubble.updateContent("Updated content");

      // Check updated content
      expect(element.innerHTML).toContain("Updated content");
      expect(element.innerHTML).not.toContain("Original content");
    });

    it("should re-render markdown when updating assistant message content", () => {
      const options = {
        role: "assistant",
        content: "Original content",
      };

      helpers.renderMarkdown.mockReturnValueOnce("<p>Original content</p>");

      const messageBubble = new MessageBubble(options);

      // Reset mock to check second call
      helpers.renderMarkdown.mockClear();
      helpers.renderMarkdown.mockReturnValueOnce("<p>Updated **content**</p>");

      // Update content
      messageBubble.updateContent("Updated **content**");

      // Check that renderMarkdown was called with new content
      expect(helpers.renderMarkdown).toHaveBeenCalledWith(
        "Updated **content**"
      );
    });
  });

  describe("Highlighting", () => {
    it("should highlight matching text in a message", () => {
      const options = {
        role: "user",
        content: "This is a test message about highlighting",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Highlight the word "test"
      messageBubble.highlightText("test");

      // Check that the word is highlighted
      expect(element.innerHTML).toContain(
        '<span class="highlight">test</span>'
      );

      // The original content should be preserved for future operations
      expect(messageBubble.options.content).toBe(
        "This is a test message about highlighting"
      );
    });

    it("should handle case-insensitive highlighting by default", () => {
      const options = {
        role: "user",
        content: "This is a TEST message",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Highlight the word "test" (lowercase)
      messageBubble.highlightText("test");

      // Check that the word is highlighted regardless of case
      expect(element.innerHTML).toContain(
        '<span class="highlight">TEST</span>'
      );
    });

    it("should support case-sensitive highlighting", () => {
      const options = {
        role: "user",
        content: "This is a TEST message and a test example",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Highlight the word "test" (lowercase) with case sensitivity
      messageBubble.highlightText("test", true);

      // Only the lowercase "test" should be highlighted
      expect(element.innerHTML).not.toContain(
        '<span class="highlight">TEST</span>'
      );
      expect(element.innerHTML).toContain(
        '<span class="highlight">test</span>'
      );
    });

    it("should restore original content when highlighting is cleared", () => {
      const options = {
        role: "user",
        content: "This is a test message",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // First apply highlighting
      messageBubble.highlightText("test");
      expect(element.innerHTML).toContain(
        '<span class="highlight">test</span>'
      );

      // Then clear highlighting
      messageBubble.highlightText("");

      // Check that the content is back to normal
      expect(element.innerHTML).not.toContain('<span class="highlight">');
      expect(element.innerHTML).toContain("This is a test message");
    });
  });

  describe("Reactions", () => {
    it("should add a reaction to the message", () => {
      const options = {
        role: "assistant",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Add a reaction
      messageBubble.addReaction("like");

      // Check that reaction was added
      const reaction = element.querySelector(".reaction-like");
      expect(reaction).not.toBeNull();
      expect(reaction.textContent).toBe("👍");
    });

    it("should replace existing reaction of the same type", () => {
      const options = {
        role: "assistant",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Add a reaction
      messageBubble.addReaction("like");

      // Add reaction of the same type again
      messageBubble.addReaction("like");

      // Should still only have one reaction
      const reactions = element.querySelectorAll(".reaction-like");
      expect(reactions.length).toBe(1);
    });

    it("should remove a reaction", () => {
      const options = {
        role: "assistant",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Add a reaction
      messageBubble.addReaction("like");

      // Check it was added
      expect(element.querySelector(".reaction-like")).not.toBeNull();

      // Remove the reaction
      messageBubble.removeReaction("like");

      // Check it was removed
      expect(element.querySelector(".reaction-like")).toBeNull();
    });
  });

  describe("CSS Classes", () => {
    it("should add and remove CSS classes", () => {
      const options = {
        role: "user",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Add a class
      messageBubble.addClass("test-class");
      expect(element.classList.contains("test-class")).toBe(true);

      // Remove a class
      messageBubble.removeClass("test-class");
      expect(element.classList.contains("test-class")).toBe(false);
    });
  });

  describe("Removal", () => {
    it("should remove the message from the DOM", () => {
      const options = {
        role: "user",
        content: "Hello world",
      };

      const messageBubble = new MessageBubble(options);
      const element = messageBubble.getElement();

      // Append to body
      document.body.appendChild(element);

      // Check it was added
      expect(document.body.contains(element)).toBe(true);

      // Remove the message
      messageBubble.remove();

      // Check it was removed
      expect(document.body.contains(element)).toBe(false);
    });
  });
});
