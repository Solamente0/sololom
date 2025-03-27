/**
 * Sololom Error Handler Utility
 *
 * Provides functions for handling and reporting errors
 */

/**
 * Handles API errors and returns user-friendly messages
 *
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export function handleApiError(error) {
  // Check if it's an API-specific error
  if (error.message && error.message.includes("API Error")) {
    // Extract specific API error details

    // OpenAI specific errors
    if (error.message.includes("OpenAI API Error")) {
      if (error.message.includes("insufficient_quota")) {
        return "Your OpenAI API key has insufficient quota. Please check your billing status.";
      }
      if (error.message.includes("invalid_api_key")) {
        return "Invalid OpenAI API key. Please check your settings.";
      }
      if (error.message.includes("rate_limit_exceeded")) {
        return "OpenAI rate limit exceeded. Please try again later.";
      }
    }

    // Anthropic specific errors
    if (error.message.includes("Anthropic API Error")) {
      if (error.message.includes("invalid_api_key")) {
        return "Invalid Anthropic API key. Please check your settings.";
      }
      if (error.message.includes("permission_error")) {
        return "Your Anthropic API key does not have permission to use this model.";
      }
    }

    // Mistral specific errors
    if (error.message.includes("Mistral API Error")) {
      if (error.message.includes("invalid_api_key")) {
        return "Invalid Mistral API key. Please check your settings.";
      }
      if (error.message.includes("rate_limit_exceeded")) {
        return "Mistral rate limit exceeded. Please try again later.";
      }
    }
    if (error.message.includes("OpenRouter API Error")) {
      if (error.message.includes("invalid_api_key")) {
        return "Invalid OpenRouter API key. Please check your settings.";
      }
      if (error.message.includes("insufficient_quota")) {
        return "Your OpenRouter account has insufficient quota. Please check your billing status.";
      }
    }
    // Return the original message if we can't provide a more specific message
    return error.message;
  }

  // Network errors
  if (error.message && error.message.includes("Failed to fetch")) {
    return "Network error. Please check your internet connection.";
  }

  // General errors
  return error.message || "An unexpected error occurred.";
}

/**
 * Logs errors to console with additional context
 *
 * @param {Error} error - The error object
 * @param {string} context - Additional context about where the error occurred
 */
export function logError(error, context = "") {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : "";

  console.error(`[${timestamp}]${contextStr} Error:`, error);
}

/**
 * Creates a standardized error response object
 *
 * @param {string} message - Error message
 * @param {number} code - Error code
 * @param {Object} details - Additional details
 * @returns {Object} - Error response object
 */
export function createErrorResponse(message, code = 500, details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Wraps an async function with error handling
 *
 * @param {Function} fn - Async function to wrap
 * @param {Function} errorHandler - Optional custom error handler
 * @returns {Function} - Wrapped function with error handling
 */
export function withErrorHandling(fn, errorHandler) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Use custom error handler if provided, otherwise use default
      if (errorHandler && typeof errorHandler === "function") {
        return errorHandler(error, ...args);
      }

      // Default error handling
      logError(error, fn.name);
      const message = handleApiError(error);

      return createErrorResponse(message);
    }
  };
}

/**
 * Reports an error to the user
 *
 * @param {string} message - Error message to display
 * @param {string} type - Error type ('error', 'warning', 'info')
 * @param {Object} options - Additional options
 * @param {boolean} options.toast - Whether to show a toast notification
 * @param {boolean} options.console - Whether to log to console
 */
export function reportError(
  message,
  type = "error",
  options = { toast: true, console: true }
) {
  const { toast, console: consoleLog } = options;

  // Log to console
  if (consoleLog) {
    console.error(`[${type.toUpperCase()}] ${message}`);
  }

  // Show toast if enabled and toast function is available
  if (toast && typeof window !== "undefined") {
    // Look for a toast function
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    } else {
      // Create a basic toast if showToast is not available
      createBasicToast(message, type);
    }
  }
}

/**
 * Creates a basic toast notification if the main toast function is not available
 *
 * @param {string} message - Message to display
 * @param {string} type - Notification type
 */
function createBasicToast(message, type) {
  // Check if we already have a toast container
  let toastContainer = document.getElementById("toast-container");

  if (!toastContainer) {
    // Create container
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";

    // Style the container
    Object.assign(toastContainer.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "9999",
    });

    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Style the toast
  Object.assign(toast.style, {
    backgroundColor:
      type === "error"
        ? "#e53935"
        : type === "warning"
        ? "#ff9800"
        : type === "success"
        ? "#4caf50"
        : "#4a6ee0",
    color: "white",
    padding: "12px 20px",
    marginBottom: "10px",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    opacity: "0",
    transition: "opacity 0.3s, transform 0.3s",
    transform: "translateY(20px)",
  });

  // Add to container
  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";

    // Remove from DOM after animation
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
