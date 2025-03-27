/**
 * Sololom Settings Service
 *
 * Provides functions for working with extension settings
 */

import * as StorageService from "./storage.js";

// Event bus for settings changes
const settingsEventHandlers = {
  global: [],
  chat: [],
};

/**
 * Gets the current global settings
 *
 * @returns {Promise<Object>} - The global settings
 */
export async function getGlobalSettings() {
  return StorageService.getGlobalSettings();
}

/**
 * Updates global settings
 *
 * @param {Object} settings - The settings to update
 * @returns {Promise<Object>} - The updated settings
 */
export async function updateGlobalSettings(settings) {
  // Get current settings
  const currentSettings = await StorageService.getGlobalSettings();

  // Merge with new settings
  const updatedSettings = {
    ...currentSettings,
    ...settings,
    // Handle nested objects
    apiKeys: {
      ...currentSettings.apiKeys,
      ...(settings.apiKeys || {}),
    },
  };

  // Save updated settings
  await StorageService.saveGlobalSettings(updatedSettings);

  // Notify subscribers
  notifySettingsChanged("global", updatedSettings);

  return updatedSettings;
}

/**
 * Gets the current chat settings
 *
 * @returns {Promise<Object>} - The chat settings
 */
export async function getChatSettings() {
  return StorageService.getChatSettings();
}

/**
 * Updates chat settings
 *
 * @param {Object} settings - The settings to update
 * @returns {Promise<Object>} - The updated settings
 */
export async function updateChatSettings(settings) {
  // Get current settings
  const currentSettings = await StorageService.getChatSettings();

  // Merge with new settings
  const updatedSettings = {
    ...currentSettings,
    ...settings,
  };

  // Save updated settings
  await StorageService.saveChatSettings(updatedSettings);

  // Notify subscribers
  notifySettingsChanged("chat", updatedSettings);

  return updatedSettings;
}

/**
 * Resets global settings to defaults
 *
 * @returns {Promise<Object>} - The default settings
 */
export async function resetGlobalSettings() {
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

  // Save default settings
  await StorageService.saveGlobalSettings(defaultSettings);

  // Notify subscribers
  notifySettingsChanged("global", defaultSettings);

  return defaultSettings;
}

/**
 * Resets chat settings to defaults
 *
 * @returns {Promise<Object>} - The default settings
 */
export async function resetChatSettings() {
  const defaultSettings = {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: "You are a helpful assistant.",
    title: "New Conversation",
  };

  // Save default settings
  await StorageService.saveChatSettings(defaultSettings);

  // Notify subscribers
  notifySettingsChanged("chat", defaultSettings);

  return defaultSettings;
}

/**
 * Subscribes to settings changes
 *
 * @param {string} type - The type of settings ('global' or 'chat')
 * @param {Function} callback - The callback function
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToSettingsChanges(type, callback) {
  if (type !== "global" && type !== "chat") {
    throw new Error('Invalid settings type. Must be "global" or "chat".');
  }

  // Add callback to handlers
  settingsEventHandlers[type].push(callback);

  // Return unsubscribe function
  return () => {
    const index = settingsEventHandlers[type].indexOf(callback);
    if (index !== -1) {
      settingsEventHandlers[type].splice(index, 1);
    }
  };
}

/**
 * Notifies subscribers of settings changes
 *
 * @param {string} type - The type of settings ('global' or 'chat')
 * @param {Object} settings - The updated settings
 */
function notifySettingsChanged(type, settings) {
  if (settingsEventHandlers[type]) {
    settingsEventHandlers[type].forEach((callback) => {
      try {
        callback(settings);
      } catch (error) {
        console.error(`Error in settings ${type} change handler:`, error);
      }
    });
  }
}

/**
 * Gets a specific global setting value
 *
 * @param {string} key - The setting key
 * @param {any} defaultValue - Default value if setting doesn't exist
 * @returns {Promise<any>} - The setting value
 */
export async function getGlobalSetting(key, defaultValue) {
  const settings = await getGlobalSettings();

  // Handle nested keys (e.g. 'apiKeys.openai')
  if (key.includes(".")) {
    const parts = key.split(".");
    let value = settings;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[part];
    }

    return value !== undefined ? value : defaultValue;
  }

  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Sets a specific global setting value
 *
 * @param {string} key - The setting key
 * @param {any} value - The setting value
 * @returns {Promise<Object>} - The updated settings
 */
export async function setGlobalSetting(key, value) {
  const settings = await getGlobalSettings();

  // Handle nested keys (e.g. 'apiKeys.openai')
  if (key.includes(".")) {
    const parts = key.split(".");
    const lastPart = parts.pop();
    let current = settings;

    // Navigate to the correct nesting level
    for (const part of parts) {
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    current[lastPart] = value;
  } else {
    // Simple key
    settings[key] = value;
  }

  // Save updated settings
  await StorageService.saveGlobalSettings(settings);

  // Notify subscribers
  notifySettingsChanged("global", settings);

  return settings;
}

/**
 * Gets a specific chat setting value
 *
 * @param {string} key - The setting key
 * @param {any} defaultValue - Default value if setting doesn't exist
 * @returns {Promise<any>} - The setting value
 */
export async function getChatSetting(key, defaultValue) {
  const settings = await getChatSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Sets a specific chat setting value
 *
 * @param {string} key - The setting key
 * @param {any} value - The setting value
 * @returns {Promise<Object>} - The updated settings
 */
export async function setChatSetting(key, value) {
  const settings = await getChatSettings();
  settings[key] = value;

  // Save updated settings
  await StorageService.saveChatSettings(settings);

  // Notify subscribers
  notifySettingsChanged("chat", settings);

  return settings;
}

/**
 * Applies theme settings to the document
 *
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
export function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "light");
}

/**
 * Applies font size setting to the document
 *
 * @param {string} size - The font size to apply ('small', 'medium', or 'large')
 */
export function applyFontSize(size) {
  document.body.setAttribute("data-font-size", size || "medium");
}

/**
 * Applies compact mode setting to the document
 *
 * @param {boolean} compact - Whether to enable compact mode
 */
export function applyCompactMode(compact) {
  document.body.setAttribute("data-compact", compact ? "true" : "false");
}

/**
 * Initializes settings for the current page
 * Automatically applies theme, font size, and compact mode
 *
 * @returns {Promise<Object>} - The global settings
 */
export async function initializePageSettings() {
  const settings = await getGlobalSettings();

  // Apply settings to the page
  applyTheme(settings.theme);
  applyFontSize(settings.fontSize);
  applyCompactMode(settings.compactMode);

  return settings;
}
