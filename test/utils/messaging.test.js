/**
 * Tests for the messaging utility functions
 */

import * as messaging from "@/utils/messaging";

describe("messaging utility functions", () => {
  describe("sendToBackground", () => {
    beforeEach(() => {
      // Reset the mock before each test
      chrome.runtime.sendMessage.mockReset();
    });

    it("should send a message to the background script", async () => {
      const message = { action: "test", data: { value: "test data" } };
      const response = { success: true };

      chrome.runtime.sendMessage.mockImplementationOnce((msg, callback) => {
        callback(response);
        return true;
      });

      const result = await messaging.sendToBackground(message);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        message,
        expect.any(Function)
      );
      expect(result).toEqual(response);
    });

    it("should reject the promise if there is a runtime error", async () => {
      const message = { action: "test" };

      chrome.runtime.sendMessage.mockImplementationOnce((msg, callback) => {
        chrome.runtime.lastError = { message: "Test error" };
        callback();
        chrome.runtime.lastError = null;
        return true;
      });

      await expect(messaging.sendToBackground(message)).rejects.toThrow(
        "Test error"
      );
    });

    it("should reject the promise if sending the message throws an error", async () => {
      const message = { action: "test" };

      chrome.runtime.sendMessage.mockImplementationOnce(() => {
        throw new Error("Send error");
      });

      await expect(messaging.sendToBackground(message)).rejects.toThrow(
        "Send error"
      );
    });
  });

  describe("sendToTab", () => {
    beforeEach(() => {
      // Reset the mock before each test
      chrome.tabs.sendMessage.mockReset();
    });

    it("should send a message to a specific tab", async () => {
      const tabId = 123;
      const message = { action: "test", data: { value: "test data" } };
      const response = { success: true };

      chrome.tabs.sendMessage.mockImplementationOnce((id, msg, callback) => {
        callback(response);
        return true;
      });

      const result = await messaging.sendToTab(tabId, message);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        tabId,
        message,
        expect.any(Function)
      );
      expect(result).toEqual(response);
    });

    it("should reject the promise if there is a runtime error", async () => {
      const tabId = 123;
      const message = { action: "test" };

      chrome.tabs.sendMessage.mockImplementationOnce((id, msg, callback) => {
        chrome.runtime.lastError = { message: "Test error" };
        callback();
        chrome.runtime.lastError = null;
        return true;
      });

      await expect(messaging.sendToTab(tabId, message)).rejects.toThrow(
        "Test error"
      );
    });

    it("should reject the promise if sending the message throws an error", async () => {
      const tabId = 123;
      const message = { action: "test" };

      chrome.tabs.sendMessage.mockImplementationOnce(() => {
        throw new Error("Send error");
      });

      await expect(messaging.sendToTab(tabId, message)).rejects.toThrow(
        "Send error"
      );
    });
  });

  describe("sendToAllTabs", () => {
    beforeEach(() => {
      // Reset the mocks before each test
      chrome.tabs.query.mockReset();
      chrome.tabs.sendMessage.mockReset();
    });

    it("should send a message to all tabs", async () => {
      const tabs = [{ id: 1 }, { id: 2 }];
      const message = { action: "test" };

      chrome.tabs.query.mockResolvedValueOnce(tabs);
      chrome.tabs.sendMessage.mockImplementation((id, msg, callback) => {
        callback({ tabId: id, success: true });
        return true;
      });

      const results = await messaging.sendToAllTabs(message);

      expect(chrome.tabs.query).toHaveBeenCalledWith({});
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(results).toEqual([
        { tabId: 1, success: true },
        { tabId: 2, success: true },
      ]);
    });

    it("should return null for tabs that failed to receive the message", async () => {
      const tabs = [{ id: 1 }, { id: 2 }];
      const message = { action: "test" };

      chrome.tabs.query.mockResolvedValueOnce(tabs);

      // First tab succeeds, second tab fails
      chrome.tabs.sendMessage.mockImplementationOnce((id, msg, callback) => {
        callback({ tabId: id, success: true });
        return true;
      });

      chrome.tabs.sendMessage.mockImplementationOnce((id, msg, callback) => {
        chrome.runtime.lastError = { message: "Tab error" };
        callback();
        chrome.runtime.lastError = null;
        return true;
      });

      const results = await messaging.sendToAllTabs(message);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(results).toEqual([{ tabId: 1, success: true }, null]);
    });
  });

  describe("setupMessageListener", () => {
    let originalAddListener;
    let originalRemoveListener;

    beforeEach(() => {
      // Save original implementations
      originalAddListener = chrome.runtime.onMessage.addListener;
      originalRemoveListener = chrome.runtime.onMessage.removeListener;

      // Reset the mocks
      chrome.runtime.onMessage.addListener.mockReset();
      chrome.runtime.onMessage.removeListener.mockReset();
    });

    it("should set up a message listener", () => {
      const handlers = {
        action1: jest.fn(),
        action2: jest.fn(),
      };

      messaging.setupMessageListener(handlers);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    it("should call the appropriate handler based on message action", () => {
      const handlers = {
        action1: jest.fn().mockReturnValue("result1"),
        action2: jest.fn().mockReturnValue("result2"),
      };

      let listener;
      chrome.runtime.onMessage.addListener.mockImplementationOnce((fn) => {
        listener = fn;
      });

      messaging.setupMessageListener(handlers);

      const sendResponse = jest.fn();
      const result1 = listener(
        { action: "action1", data: "test" },
        {},
        sendResponse
      );
      const result2 = listener(
        { action: "action2", data: "test" },
        {},
        sendResponse
      );
      const result3 = listener(
        { action: "unknown", data: "test" },
        {},
        sendResponse
      );

      expect(handlers.action1).toHaveBeenCalledWith(
        { action: "action1", data: "test" },
        {}
      );
      expect(handlers.action2).toHaveBeenCalledWith(
        { action: "action2", data: "test" },
        {}
      );
      expect(sendResponse).toHaveBeenCalledWith("result1");
      expect(sendResponse).toHaveBeenCalledWith("result2");
      expect(result1).toBe(false); // Not async
      expect(result2).toBe(false); // Not async
      expect(result3).toBe(false); // Unknown action
    });

    it("should handle async handlers and keep message channel open", () => {
      const handlers = {
        asyncAction: jest.fn().mockResolvedValue("async result"),
      };

      let listener;
      chrome.runtime.onMessage.addListener.mockImplementationOnce((fn) => {
        listener = fn;
      });

      messaging.setupMessageListener(handlers);

      const sendResponse = jest.fn();
      const result = listener({ action: "asyncAction" }, {}, sendResponse);

      expect(handlers.asyncAction).toHaveBeenCalled();
      expect(result).toBe(true); // Async handler should return true to keep message channel open

      // After the promise resolves, sendResponse should be called
      return new Promise((resolve) => {
        setImmediate(() => {
          expect(sendResponse).toHaveBeenCalledWith("async result");
          resolve();
        });
      });
    });

    it("should handle errors in async handlers", () => {
      const error = new Error("Async error");
      const handlers = {
        asyncError: jest.fn().mockRejectedValue(error),
      };

      let listener;
      chrome.runtime.onMessage.addListener.mockImplementationOnce((fn) => {
        listener = fn;
      });

      messaging.setupMessageListener(handlers);

      const sendResponse = jest.fn();
      listener({ action: "asyncError" }, {}, sendResponse);

      // After the promise rejects, sendResponse should be called with an error
      return new Promise((resolve) => {
        setImmediate(() => {
          expect(sendResponse).toHaveBeenCalledWith({ error: error.message });
          resolve();
        });
      });
    });

    it("should return a function to remove the listener", () => {
      let listener;
      chrome.runtime.onMessage.addListener.mockImplementationOnce((fn) => {
        listener = fn;
      });

      const removeListener = messaging.setupMessageListener({});

      expect(typeof removeListener).toBe("function");

      removeListener();

      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(
        listener
      );
    });
  });
});
