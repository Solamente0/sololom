/**
 * Tests for the settings service
 */

import * as SettingsService from "@/services/settings";
import * as StorageService from "@/services/storage";

// Mock the storage service
jest.mock("@/services/storage");

describe("Settings Service", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default implementations for storage service mocks
    StorageService.getGlobalSettings.mockResolvedValue({
      theme: "light",
      defaultModel: "gpt-3.5-turbo",
      apiKeys: {
        openai: "test-key",
        anthropic: "",
        mistral: "",
      },
    });

    StorageService.getChatSettings.mockResolvedValue({
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: "You are a helpful assistant.",
      title: "New Conversation",
    });

    StorageService.saveGlobalSettings.mockResolvedValue(true);
    StorageService.saveChatSettings.mockResolvedValue(true);
  });

  describe("getGlobalSettings", () => {
    it("should call storage service to get global settings", async () => {
      const settings = await SettingsService.getGlobalSettings();

      expect(StorageService.getGlobalSettings).toHaveBeenCalled();
      expect(settings).toEqual({
        theme: "light",
        defaultModel: "gpt-3.5-turbo",
        apiKeys: {
          openai: "test-key",
          anthropic: "",
          mistral: "",
        },
      });
    });
  });

  describe("updateGlobalSettings", () => {
    it("should merge new settings with existing settings", async () => {
      const newSettings = {
        theme: "dark",
        fontSize: "large",
      };

      const updatedSettings = await SettingsService.updateGlobalSettings(
        newSettings
      );

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith({
        theme: "dark",
        defaultModel: "gpt-3.5-turbo",
        fontSize: "large",
        apiKeys: {
          openai: "test-key",
          anthropic: "",
          mistral: "",
        },
      });

      expect(updatedSettings).toEqual({
        theme: "dark",
        defaultModel: "gpt-3.5-turbo",
        fontSize: "large",
        apiKeys: {
          openai: "test-key",
          anthropic: "",
          mistral: "",
        },
      });
    });

    it("should properly merge nested objects like apiKeys", async () => {
      const newSettings = {
        apiKeys: {
          anthropic: "new-key",
        },
      };

      await SettingsService.updateGlobalSettings(newSettings);

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith({
        theme: "light",
        defaultModel: "gpt-3.5-turbo",
        apiKeys: {
          openai: "test-key",
          anthropic: "new-key",
          mistral: "",
        },
      });
    });

    it("should notify subscribers when settings are updated", async () => {
      // Create a mock subscriber
      const subscriber = jest.fn();

      // Subscribe to global settings changes
      const unsubscribe = SettingsService.subscribeToSettingsChanges(
        "global",
        subscriber
      );

      // Update settings
      const newSettings = { theme: "dark" };
      await SettingsService.updateGlobalSettings(newSettings);

      // Check that the subscriber was called with the updated settings
      expect(subscriber).toHaveBeenCalledWith({
        theme: "dark",
        defaultModel: "gpt-3.5-turbo",
        apiKeys: {
          openai: "test-key",
          anthropic: "",
          mistral: "",
        },
      });

      // Unsubscribe
      unsubscribe();

      // Update settings again
      await SettingsService.updateGlobalSettings({ fontSize: "large" });

      // Check that the subscriber was not called again
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("getChatSettings", () => {
    it("should call storage service to get chat settings", async () => {
      const settings = await SettingsService.getChatSettings();

      expect(StorageService.getChatSettings).toHaveBeenCalled();
      expect(settings).toEqual({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      });
    });
  });

  describe("updateChatSettings", () => {
    it("should merge new settings with existing settings", async () => {
      const newSettings = {
        model: "gpt-4",
        temperature: 0.9,
      };

      const updatedSettings = await SettingsService.updateChatSettings(
        newSettings
      );

      expect(StorageService.saveChatSettings).toHaveBeenCalledWith({
        model: "gpt-4",
        temperature: 0.9,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      });

      expect(updatedSettings).toEqual({
        model: "gpt-4",
        temperature: 0.9,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      });
    });

    it("should notify subscribers when settings are updated", async () => {
      // Create a mock subscriber
      const subscriber = jest.fn();

      // Subscribe to chat settings changes
      const unsubscribe = SettingsService.subscribeToSettingsChanges(
        "chat",
        subscriber
      );

      // Update settings
      const newSettings = { model: "gpt-4" };
      await SettingsService.updateChatSettings(newSettings);

      // Check that the subscriber was called with the updated settings
      expect(subscriber).toHaveBeenCalledWith({
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      });

      // Unsubscribe
      unsubscribe();
    });
  });

  describe("resetGlobalSettings", () => {
    it("should reset global settings to defaults", async () => {
      const defaultSettings = {
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
      };

      const resetSettings = await SettingsService.resetGlobalSettings();

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
        defaultSettings
      );
      expect(resetSettings).toEqual(defaultSettings);
    });
  });

  describe("resetChatSettings", () => {
    it("should reset chat settings to defaults", async () => {
      const defaultSettings = {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
        title: "New Conversation",
      };

      const resetSettings = await SettingsService.resetChatSettings();

      expect(StorageService.saveChatSettings).toHaveBeenCalledWith(
        defaultSettings
      );
      expect(resetSettings).toEqual(defaultSettings);
    });
  });

  describe("subscribeToSettingsChanges", () => {
    it("should throw an error for invalid settings type", () => {
      expect(() => {
        SettingsService.subscribeToSettingsChanges("invalid", jest.fn());
      }).toThrow('Invalid settings type. Must be "global" or "chat".');
    });

    it("should add and remove event handlers", async () => {
      // Create mock subscribers
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      // Subscribe to global settings changes
      const unsubscribe1 = SettingsService.subscribeToSettingsChanges(
        "global",
        subscriber1
      );
      const unsubscribe2 = SettingsService.subscribeToSettingsChanges(
        "global",
        subscriber2
      );

      // Update settings
      await SettingsService.updateGlobalSettings({ theme: "dark" });

      // Check that both subscribers were called
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();

      // Unsubscribe the first subscriber
      unsubscribe1();

      // Update settings again
      await SettingsService.updateGlobalSettings({ fontSize: "large" });

      // Check that only the second subscriber was called again
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(2);

      // Unsubscribe the second subscriber
      unsubscribe2();

      // Update settings one more time
      await SettingsService.updateGlobalSettings({ compactMode: true });

      // Check that no subscribers were called
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(2);
    });
  });

  describe("getGlobalSetting / setGlobalSetting", () => {
    it("should get a specific global setting value", async () => {
      const theme = await SettingsService.getGlobalSetting("theme", "default");
      expect(theme).toBe("light");

      const nonExistent = await SettingsService.getGlobalSetting(
        "nonExistent",
        "default"
      );
      expect(nonExistent).toBe("default");
    });

    it("should handle nested keys", async () => {
      const apiKey = await SettingsService.getGlobalSetting(
        "apiKeys.openai",
        ""
      );
      expect(apiKey).toBe("test-key");

      const nonExistentNested = await SettingsService.getGlobalSetting(
        "apiKeys.nonExistent",
        "default"
      );
      expect(nonExistentNested).toBe("default");
    });

    it("should set a specific global setting value", async () => {
      await SettingsService.setGlobalSetting("theme", "dark");

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "dark" })
      );
    });

    it("should handle setting nested keys", async () => {
      await SettingsService.setGlobalSetting("apiKeys.anthropic", "new-key");

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: expect.objectContaining({
            openai: "test-key",
            anthropic: "new-key",
          }),
        })
      );
    });

    it("should create nested objects if needed", async () => {
      await SettingsService.setGlobalSetting("advanced.debug", true);

      expect(StorageService.saveGlobalSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          advanced: expect.objectContaining({
            debug: true,
          }),
        })
      );
    });
  });

  describe("getChatSetting / setChatSetting", () => {
    it("should get a specific chat setting value", async () => {
      const temperature = await SettingsService.getChatSetting(
        "temperature",
        0.5
      );
      expect(temperature).toBe(0.7);

      const nonExistent = await SettingsService.getChatSetting(
        "nonExistent",
        "default"
      );
      expect(nonExistent).toBe("default");
    });

    it("should set a specific chat setting value", async () => {
      await SettingsService.setChatSetting("temperature", 0.9);

      expect(StorageService.saveChatSettings).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.9 })
      );
    });
  });

  describe("UI theme functions", () => {
    it("should apply theme to the document body", () => {
      // Mock document.body
      document.body.setAttribute = jest.fn();

      SettingsService.applyTheme("dark");

      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark"
      );
    });

    it("should apply font size to the document body", () => {
      // Mock document.body
      document.body.setAttribute = jest.fn();

      SettingsService.applyFontSize("large");

      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-font-size",
        "large"
      );
    });

    it("should apply compact mode to the document body", () => {
      // Mock document.body
      document.body.setAttribute = jest.fn();

      SettingsService.applyCompactMode(true);

      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-compact",
        "true"
      );
    });

    it("should initialize page settings", async () => {
      // Mock document.body
      document.body.setAttribute = jest.fn();

      // Mock getGlobalSettings to return specific values
      StorageService.getGlobalSettings.mockResolvedValueOnce({
        theme: "dark",
        fontSize: "large",
        compactMode: true,
      });

      const settings = await SettingsService.initializePageSettings();

      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark"
      );
      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-font-size",
        "large"
      );
      expect(document.body.setAttribute).toHaveBeenCalledWith(
        "data-compact",
        "true"
      );
      expect(settings).toEqual({
        theme: "dark",
        fontSize: "large",
        compactMode: true,
      });
    });
  });
});
