/**
 * Tests for the storage service
 */

import * as StorageService from "../../src/services/storage";

describe("Storage Service", () => {
  beforeEach(() => {
    // Reset all mock implementations
    chrome.storage.sync.get.mockReset();
    chrome.storage.sync.set.mockReset();
    chrome.storage.sync.clear.mockReset();

    // Default mock implementation for chrome.storage.sync.get
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = {};
      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    });

    // Default mock implementation for chrome.storage.sync.set
    chrome.storage.sync.set.mockImplementation((items, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    });
  });

  describe("getGlobalSettings", () => {
    it("should return default global settings if none exist in storage", async () => {
      const settings = await StorageService.getGlobalSettings();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith("globalSettings");
      expect(settings).toEqual({
        theme: "light",
        defaultModel: "gpt-3.5-turbo",
        apiKeys: {
          openai: "",
          anthropic: "",
          mistral: "",
        },
        saveConversations: true,
        maxConversations: 100,
        fontSize: "medium",
        compactMode: false,
        contextWindow: 0,
      });
    });

    it("should return stored global settings if they exist", async () => {
      const storedSettings = {
        theme: "dark",
        defaultModel: "gpt-4",
        apiKeys: {
          openai: "test-key",
        },
      };

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { globalSettings: storedSettings };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const settings = await StorageService.getGlobalSettings();

      expect(settings).toEqual(storedSettings);
    });

    it("should handle errors when getting global settings", async () => {
      // Mock console.error to avoid polluting test output
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Make chrome.storage.sync.get throw an error
      chrome.storage.sync.get.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      const settings = await StorageService.getGlobalSettings();

      // Should return default settings on error
      expect(settings).toEqual({
        theme: "light",
        defaultModel: "gpt-3.5-turbo",
        apiKeys: {
          openai: "",
          anthropic: "",
          mistral: "",
        },
        saveConversations: true,
        maxConversations: 100,
        fontSize: "medium",
        compactMode: false,
        contextWindow: 0,
      });

      // Should log the error
      expect(console.error).toHaveBeenCalled();

      // Restore console.error
      console.error.mockRestore();
    });
  });

  describe("saveGlobalSettings", () => {
    it("should save global settings to storage", async () => {
      const settings = {
        theme: "dark",
        defaultModel: "gpt-4",
        apiKeys: {
          openai: "test-key",
        },
      };

      await StorageService.saveGlobalSettings(settings);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        globalSettings: expect.objectContaining({
          theme: "dark",
          defaultModel: "gpt-4",
          apiKeys: {
            openai: "test-key",
            anthropic: "",
            mistral: "",
          },
        }),
      });
    });

    it("should merge with default settings", async () => {
      const settings = {
        theme: "dark",
      };

      await StorageService.saveGlobalSettings(settings);

      // Check that the saved settings include default values for unspecified properties
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        globalSettings: expect.objectContaining({
          theme: "dark",
          defaultModel: "gpt-3.5-turbo",
          apiKeys: {
            openai: "",
            anthropic: "",
            mistral: "",
          },
        }),
      });
    });

    it("should handle errors when saving global settings", async () => {
      const settings = { theme: "dark" };

      chrome.storage.sync.set.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      await expect(StorageService.saveGlobalSettings(settings)).rejects.toThrow(
        "Test error"
      );
    });
  });

  describe("getChatSettings", () => {
    it("should return default chat settings if none exist in storage", async () => {
      const settings = await StorageService.getChatSettings();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith("chatSettings");
      expect(settings).toEqual({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      });
    });

    it("should return stored chat settings if they exist", async () => {
      const storedSettings = {
        model: "claude-3-opus",
        temperature: 0.9,
        systemPrompt: "Custom prompt",
      };

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { chatSettings: storedSettings };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const settings = await StorageService.getChatSettings();

      expect(settings).toEqual(storedSettings);
    });
  });

  describe("getConversations", () => {
    it("should return an empty array if no conversations exist in storage", async () => {
      const conversations = await StorageService.getConversations();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith("conversations");
      expect(conversations).toEqual([]);
    });

    it("should return stored conversations if they exist", async () => {
      const storedConversations = [
        { id: "1", title: "Conversation 1" },
        { id: "2", title: "Conversation 2" },
      ];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: storedConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const conversations = await StorageService.getConversations();

      expect(conversations).toEqual(storedConversations);
    });
  });

  describe("saveConversation", () => {
    it("should add a new conversation with ID and timestamp if not provided", async () => {
      // Mock Date.now to return a fixed value
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const conversation = {
        title: "Test Conversation",
        messages: [],
      };

      await StorageService.saveConversation(conversation);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        conversations: [
          {
            id: "1234567890",
            timestamp: 1234567890,
            title: "Test Conversation",
            messages: [],
          },
        ],
      });

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it("should update an existing conversation", async () => {
      const existingConversations = [
        { id: "1", title: "Conversation 1", messages: [] },
        { id: "2", title: "Conversation 2", messages: [] },
      ];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: existingConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const updatedConversation = {
        id: "1",
        title: "Updated Conversation",
        messages: [{ role: "user", content: "Hello" }],
        timestamp: 1234567890,
      };

      await StorageService.saveConversation(updatedConversation);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        conversations: [updatedConversation, existingConversations[1]],
      });
    });

    it("should limit the number of conversations based on global settings", async () => {
      // Set up mock conversations
      const existingConversations = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        title: `Conversation ${i}`,
        messages: [],
      }));

      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        let result = {};

        if (keys === "conversations") {
          result = { conversations: existingConversations };
        } else if (keys === "globalSettings") {
          result = {
            globalSettings: {
              maxConversations: 3,
            },
          };
        }

        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const newConversation = {
        title: "New Conversation",
        messages: [],
        timestamp: 1234567890,
      };

      await StorageService.saveConversation(newConversation);

      // Should save the new conversation and limit to 3 total
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        conversations: expect.arrayContaining([
          expect.objectContaining({ title: "New Conversation" }),
        ]),
      });

      // Check that only 3 conversations were saved
      const savedConversations =
        chrome.storage.sync.set.mock.calls[0][0].conversations;
      expect(savedConversations.length).toBe(3);
    });
  });

  describe("deleteConversation", () => {
    it("should delete a conversation by ID", async () => {
      const existingConversations = [
        { id: "1", title: "Conversation 1" },
        { id: "2", title: "Conversation 2" },
      ];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: existingConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const result = await StorageService.deleteConversation("1");

      expect(result).toBe(true);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        conversations: [existingConversations[1]],
      });
    });

    it("should return false if the conversation does not exist", async () => {
      const existingConversations = [{ id: "1", title: "Conversation 1" }];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: existingConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const result = await StorageService.deleteConversation("2");

      expect(result).toBe(false);
      expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe("getConversationById", () => {
    it("should return a conversation by ID", async () => {
      const existingConversations = [
        { id: "1", title: "Conversation 1" },
        { id: "2", title: "Conversation 2" },
      ];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: existingConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const conversation = await StorageService.getConversationById("2");

      expect(conversation).toEqual(existingConversations[1]);
    });

    it("should return null if the conversation does not exist", async () => {
      const existingConversations = [{ id: "1", title: "Conversation 1" }];

      chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        const result = { conversations: existingConversations };
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });

      const conversation = await StorageService.getConversationById("2");

      expect(conversation).toBeNull();
    });
  });

  describe("clearAllData", () => {
    it("should clear all data in storage", async () => {
      await StorageService.clearAllData();

      expect(chrome.storage.sync.clear).toHaveBeenCalled();
    });

    it("should handle errors when clearing data", async () => {
      chrome.storage.sync.clear.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      await expect(StorageService.clearAllData()).rejects.toThrow("Test error");
    });
  });

  describe("exportData and importData", () => {
    beforeEach(() => {
      // Mock the storage data
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        const globalSettings = {
          theme: "dark",
          apiKeys: {
            openai: "test-key",
            anthropic: "test-key-2",
            mistral: "",
          },
        };

        const chatSettings = {
          model: "gpt-4",
          temperature: 0.8,
        };

        const conversations = [{ id: "1", title: "Conversation 1" }];

        let result = {};

        if (keys === "globalSettings") {
          result = { globalSettings };
        } else if (keys === "chatSettings") {
          result = { chatSettings };
        } else if (keys === "conversations") {
          result = { conversations };
        }

        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      });
    });

    describe("exportData", () => {
      it("should export data as JSON string with API keys replaced by placeholders", async () => {
        const jsonData = await StorageService.exportData();
        const data = JSON.parse(jsonData);

        expect(data).toEqual({
          globalSettings: {
            theme: "dark",
            apiKeys: {
              openai: "[API_KEY]",
              anthropic: "[API_KEY]",
              mistral: "",
            },
          },
          chatSettings: {
            model: "gpt-4",
            temperature: 0.8,
          },
          conversations: [{ id: "1", title: "Conversation 1" }],
          exportDate: expect.any(Number),
        });
      });

      it("should include real API keys if includeApiKeys option is true", async () => {
        const jsonData = await StorageService.exportData({
          includeApiKeys: true,
        });
        const data = JSON.parse(jsonData);

        expect(data.globalSettings.apiKeys).toEqual({
          openai: "test-key",
          anthropic: "test-key-2",
          mistral: "",
        });
      });
    });

    describe("importData", () => {
      it("should import data without overwriting existing data by default", async () => {
        const importData = {
          globalSettings: {
            theme: "light",
            defaultModel: "gpt-3.5-turbo",
          },
          chatSettings: {
            model: "claude-3-opus",
          },
          conversations: [{ id: "2", title: "Imported Conversation" }],
        };

        // Spy on the save methods
        jest.spyOn(StorageService, "saveGlobalSettings");

        await StorageService.importData(JSON.stringify(importData));

        // Check that the global settings were merged correctly
        expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: "light",
            defaultModel: "gpt-3.5-turbo",
            apiKeys: {
              openai: "test-key",
              anthropic: "test-key-2",
              mistral: "",
            },
          })
        );

        // Check that the conversations were merged
        const setCall = chrome.storage.sync.set.mock.calls.find(
          (call) => call[0].conversations
        );
        expect(setCall[0].conversations).toEqual([
          { id: "1", title: "Conversation 1" },
          { id: "2", title: "Imported Conversation" },
        ]);

        // Restore the spy
        StorageService.saveGlobalSettings.mockRestore();
      });

      it("should overwrite existing data if overwrite option is true", async () => {
        const importData = {
          globalSettings: {
            theme: "light",
          },
          chatSettings: {
            model: "claude-3-opus",
          },
          conversations: [{ id: "2", title: "Imported Conversation" }],
        };

        await StorageService.importData(JSON.stringify(importData), {
          overwrite: true,
        });

        // Check that the conversations were completely replaced
        const setCall = chrome.storage.sync.set.mock.calls.find(
          (call) => call[0].conversations
        );
        expect(setCall[0].conversations).toEqual([
          { id: "2", title: "Imported Conversation" },
        ]);
      });

      it("should not import placeholder API keys", async () => {
        const importData = {
          globalSettings: {
            theme: "light",
            apiKeys: {
              openai: "[API_KEY]",
              anthropic: "new-key",
              mistral: "[API_KEY]",
            },
          },
        };

        // Spy on the save method
        jest.spyOn(StorageService, "saveGlobalSettings");

        await StorageService.importData(JSON.stringify(importData), {
          importApiKeys: true,
        });

        // Check that placeholder API keys were not imported
        expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKeys: {
              openai: "test-key", // Kept existing
              anthropic: "new-key", // Imported
              mistral: "", // Kept existing
            },
          })
        );

        // Restore the spy
        StorageService.saveGlobalSettings.mockRestore();
      });

      it("should reject with an error if the JSON data is invalid", async () => {
        const invalidJson = "{ invalid: json }";

        await expect(StorageService.importData(invalidJson)).rejects.toThrow();
      });

      it("should reject with an error if the imported data format is invalid", async () => {
        const invalidData = JSON.stringify({ invalidFormat: true });

        await expect(StorageService.importData(invalidData)).rejects.toThrow(
          "Invalid import data format"
        );
      });
    });
  });
});
