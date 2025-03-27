/**
 * Message Bubble Component
 *
 * Renders individual message bubbles in the chat interface
 */

import { renderMarkdown } from "../utils/helpers.js";

export default class MessageBubble {
  /**
   * Creates a new MessageBubble instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.role - Message role ('user' or 'assistant')
   * @param {string} options.content - Message content
   * @param {boolean} options.enableCopy - Whether to show copy button
   * @param {Function} options.onCopy - Callback when message is copied
   */
  constructor(options) {
    this.options = {
      enableCopy: true,
      ...options,
    };

    this.element = this.render();
  }

  /**
   * Renders the message bubble
   *
   * @returns {HTMLElement} - The message bubble element
   */
  render() {
    const { role, content, enableCopy } = this.options;

    // Create message container
    const messageElement = document.createElement("div");
    messageElement.className = `message message-${role}`;

    // Create message bubble
    const bubbleElement = document.createElement("div");
    bubbleElement.className = "message-bubble";

    // Format content based on role
    if (role === "assistant") {
      bubbleElement.innerHTML = renderMarkdown(content);

      // Add copy button if enabled
      if (enableCopy) {
        const copyButton = document.createElement("button");
        copyButton.className = "copy-message-btn";
        copyButton.innerHTML = "<span>Copy</span>";
        copyButton.title = "Copy message";
        copyButton.addEventListener("click", () => this.copyMessage());

        // Add to message element
        messageElement.appendChild(copyButton);
      }
    } else {
      // For user messages, just replace newlines with <br>
      bubbleElement.innerHTML = `<p>${content.replace(/\n/g, "<br>")}</p>`;
    }

    // Add bubble to message container
    messageElement.appendChild(bubbleElement);

    return messageElement;
  }

  /**
   * Copies the message content to clipboard
   */
  copyMessage() {
    const { content, onCopy } = this.options;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        // Change button text temporarily
        const copyButton = this.element.querySelector(".copy-message-btn");
        if (copyButton) {
          const originalText = copyButton.innerHTML;
          copyButton.innerHTML = "<span>Copied!</span>";

          setTimeout(() => {
            copyButton.innerHTML = originalText;
          }, 2000);
        }

        // Call onCopy callback if provided
        if (onCopy) {
          onCopy(content);
        }
      })
      .catch((err) => {
        console.error("Failed to copy message:", err);
      });
  }

  /**
   * Gets the DOM element
   *
   * @returns {HTMLElement} - The message bubble element
   */
  getElement() {
    return this.element;
  }

  /**
   * Updates the message content
   *
   * @param {string} content - New message content
   */
  updateContent(content) {
    const bubbleElement = this.element.querySelector(".message-bubble");

    if (bubbleElement) {
      if (this.options.role === "assistant") {
        bubbleElement.innerHTML = renderMarkdown(content);
      } else {
        bubbleElement.innerHTML = `<p>${content.replace(/\n/g, "<br>")}</p>`;
      }
    }

    // Update the stored content
    this.options.content = content;
  }

  /**
   * Adds a reaction to the message
   *
   * @param {string} type - Reaction type ('like', 'dislike', etc.)
   */
  addReaction(type) {
    // Remove any existing reactions of the same type
    const existingReaction = this.element.querySelector(`.reaction-${type}`);
    if (existingReaction) {
      existingReaction.remove();
    }

    // Create reaction element
    const reactionElement = document.createElement("span");
    reactionElement.className = `message-reaction reaction-${type}`;

    // Set reaction icon based on type
    switch (type) {
      case "like":
        reactionElement.innerHTML = "👍";
        break;
      case "dislike":
        reactionElement.innerHTML = "👎";
        break;
      case "love":
        reactionElement.innerHTML = "❤️";
        break;
      case "laugh":
        reactionElement.innerHTML = "😄";
        break;
      default:
        reactionElement.innerHTML = type;
    }

    // Add to message element
    this.element.appendChild(reactionElement);
  }

  /**
   * Removes a reaction from the message
   *
   * @param {string} type - Reaction type to remove
   */
  removeReaction(type) {
    const reaction = this.element.querySelector(`.reaction-${type}`);
    if (reaction) {
      reaction.remove();
    }
  }

  /**
   * Adds a CSS class to the message
   *
   * @param {string} className - CSS class to add
   */
  addClass(className) {
    this.element.classList.add(className);
  }

  /**
   * Removes a CSS class from the message
   *
   * @param {string} className - CSS class to remove
   */
  removeClass(className) {
    this.element.classList.remove(className);
  }

  /**
   * Highlights matching text in the message
   *
   * @param {string} text - Text to highlight
   * @param {boolean} caseSensitive - Whether the search is case-sensitive
   */
  highlightText(text, caseSensitive = false) {
    if (!text) {
      // If no text to highlight, restore original content
      this.updateContent(this.options.content);
      return;
    }

    const content = this.options.content;
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(
      `(${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      flags
    );

    let formattedContent;

    if (this.options.role === "assistant") {
      // For markdown content, we need to be careful with HTML tags
      // This is a simplified approach, a more robust one would use a markdown parser
      formattedContent = renderMarkdown(content).replace(
        regex,
        '<span class="highlight">$1</span>'
      );
    } else {
      formattedContent = `<p>${content
        .replace(/\n/g, "<br>")
        .replace(regex, '<span class="highlight">$1</span>')}</p>`;
    }

    const bubbleElement = this.element.querySelector(".message-bubble");
    if (bubbleElement) {
      bubbleElement.innerHTML = formattedContent;
    }
  }

  /**
   * Removes the message from the DOM
   */
  remove() {
    this.element.remove();
  }
}
