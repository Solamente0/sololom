/**
 * Sololom Storage Service
 * 
 * Provides an abstraction layer over browser storage APIs
 */

/**
 * Default global settings
 */
const DEFAULT_GLOBAL_SETTINGS = {
  theme: 'light',
  defaultModel: 'gpt-3.5-turbo',
  apiKeys: {
    openai: '',
    anthropic: '',
    mistral: ''
  },
  saveConversations: true,
  maxConversations: 100,
  fontSize: 'medium',
  compactMode: false,
  contextWindow: 0
};

/**
 * Default chat settings
 */
const DEFAULT_CHAT_SETTINGS = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful assistant.',
  title: 'New Conversation'
};

/**
 * Gets global settings
 * 
 * @returns {Promise<Object>} - The global settings
 */
export async function getGlobalSettings() {
  try {
    const result = await chrome.storage.sync.get('globalSettings');
    return result.globalSettings || DEFAULT_GLOBAL_SETTINGS;
  } catch (error) {
    console.error('Error getting global settings:', error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

/**
 * Saves global settings
 * 
 * @param {Object} settings - The settings to save
 * @returns {Promise<void>}
 */
export async function saveGlobalSettings(settings) {
  try {
    // Merge with defaults to ensure all properties exist
    const mergedSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...settings,
      // Ensure nested objects are merged properly
      apiKeys: {
        ...DEFAULT_GLOBAL_SETTINGS.apiKeys,
        ...(settings.apiKeys || {})
      }
    };
    
    await chrome.storage.sync.set({ globalSettings: mergedSettings });
    return true;
  } catch (error) {
    console.error('Error saving global settings:', error);
    throw error;
  }
}

/**
 * Gets chat settings
 * 
 * @returns {Promise<Object>} - The chat settings
 */
export async function getChatSettings() {
  try {
    const result = await chrome.storage.sync.get('chatSettings');
    return result.chatSettings || DEFAULT_CHAT_SETTINGS;
  } catch (error) {
    console.error('Error getting chat settings:', error);
    return DEFAULT_CHAT_SETTINGS;
  }
}

/**
 * Saves chat settings
 * 
 * @param {Object} settings - The settings to save
 * @returns {Promise<void>}
 */
export async function saveChatSettings(settings) {
  try {
    // Merge with defaults to ensure all properties exist
    const mergedSettings = {
      ...DEFAULT_CHAT_SETTINGS,
      ...settings
    };
    
    await chrome.storage.sync.set({ chatSettings: mergedSettings });
    return true;
  } catch (error) {
    console.error('Error saving chat settings:', error);
    throw error;
  }
}

/**
 * Gets all conversations
 * 
 * @returns {Promise<Array>} - The conversations
 */
export async function getConversations() {
  try {
    const result = await chrome.storage.sync.get('conversations');
    return result.conversations || [];
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
}

/**
 * Saves a conversation
 * 
 * @param {Object} conversation - The conversation to save
 * @returns {Promise<void>}
 */
export async function saveConversation(conversation) {
  try {
    // Make sure the conversation has an ID and timestamp
    if (!conversation.id) {
      conversation.id = Date.now().toString();
    }
    
    if (!conversation.timestamp) {
      conversation.timestamp = Date.now();
    }
    
    // Get existing conversations
    const conversations = await getConversations();
    
    // Check if this conversation already exists
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    // Get global settings for max conversations
    const globalSettings = await getGlobalSettings();
    const maxConversations = globalSettings.maxConversations || 100;
    
    let updatedConversations;
    
    if (index !== -1) {
      // Update existing conversation
      updatedConversations = [
        ...conversations.slice(0, index),
        conversation,
        ...conversations.slice(index + 1)
      ];
    } else {
      // Add new conversation at the beginning
      updatedConversations = [conversation, ...conversations];
    }
    
    // Limit to max conversations
    updatedConversations = updatedConversations.slice(0, maxConversations);
    
    // Save updated conversations
    await chrome.storage.sync.set({ conversations: updatedConversations });
    return true;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Deletes a conversation
 * 
 * @param {string} id - The ID of the conversation to delete
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export async function deleteConversation(id) {
  try {
    // Get existing conversations
    const conversations = await getConversations();
    
    // Filter out the conversation to delete
    const updatedConversations = conversations.filter(c => c.id !== id);
    
    // If the length is the same, the conversation wasn't found
    if (updatedConversations.length === conversations.length) {
      return false;
    }
    
    // Save updated conversations
    await chrome.storage.sync.set({ conversations: updatedConversations });
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Gets a conversation by ID
 * 
 * @param {string} id - The ID of the conversation to get
 * @returns {Promise<Object|null>} - The conversation or null if not found
 */
export async function getConversationById(id) {
  try {
    const conversations = await getConversations();
    return conversations.find(c => c.id === id) || null;
  } catch (error) {
    console.error('Error getting conversation by ID:', error);
    return null;
  }
}

/**
 * Clears all storage data
 * 
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  try {
    await chrome.storage.sync.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
}

/**
 * Exports all settings and conversations to a JSON string
 * 
 * @param {Object} options - Export options
 * @param {boolean} options.includeApiKeys - Whether to include API keys
 * @returns {Promise<string>} - The exported data as a JSON string
 */
export async function exportData(options = { includeApiKeys: false }) {
  try {
    // Get all data
    const [globalSettings, chatSettings, conversations] = await Promise.all([
      getGlobalSettings(),
      getChatSettings(),
      getConversations()
    ]);
    
    // Optionally remove API keys for security
    if (!options.includeApiKeys) {
      globalSettings.apiKeys = {
        openai: globalSettings.apiKeys.openai ? '[API_KEY]' : '',
        anthropic: globalSettings.apiKeys.anthropic ? '[API_KEY]' : '',
        mistral: globalSettings.apiKeys.mistral ? '[API_KEY]' : ''
      };
    }
    
    // Create export data
    const exportData = {
      globalSettings,
      chatSettings,
      conversations,
      exportDate: Date.now()
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Imports data from a JSON string
 * 
 * @param {string} jsonData - The JSON data to import
 * @param {Object} options - Import options
 * @param {boolean} options.overwrite - Whether to overwrite existing data
 * @param {boolean} options.importApiKeys - Whether to import API keys
 * @returns {Promise<Object>} - Result of the import
 */
export async function importData(jsonData, options = { overwrite: false, importApiKeys: false }) {
  try {
    // Parse the JSON data
    const data = JSON.parse(jsonData);
    
    // Validate the data
    if (!data.globalSettings || !data.chatSettings) {
      throw new Error('Invalid import data format');
    }
    
    // Get current data if not overwriting
    let currentGlobalSettings = {};
    let currentChatSettings = {};
    let currentConversations = [];
    
    if (!options.overwrite) {
      [currentGlobalSettings, currentChatSettings, currentConversations] = await Promise.all([
        getGlobalSettings(),
        getChatSettings(),
        getConversations()
      ]);
    }
    
    // Handle API keys separately based on importApiKeys option
    let apiKeys = currentGlobalSettings.apiKeys || {};
    
    if (options.importApiKeys) {
      // Import API keys, but don't overwrite if they're placeholder values
      apiKeys = {
        ...apiKeys,
        ...data.globalSettings.apiKeys
      };
      
      // Don't import placeholder API keys
      if (apiKeys.openai === '[API_KEY]') apiKeys.openai = currentGlobalSettings.apiKeys?.openai || '';
      if (apiKeys.anthropic === '[API_KEY]') apiKeys.anthropic = currentGlobalSettings.apiKeys?.anthropic || '';
      if (apiKeys.mistral === '[API_KEY]') apiKeys.mistral = currentGlobalSettings.apiKeys?.mistral || '';
    }
    
    // Merge global settings
    const mergedGlobalSettings = {
      ...(options.overwrite ? {} : currentGlobalSettings),
      ...data.globalSettings,
      apiKeys
    };
    
    // Merge chat settings
    const mergedChatSettings = {
      ...(options.overwrite ? {} : currentChatSettings),
      ...data.chatSettings
    };
    
    // Merge conversations
    let mergedConversations;
    
    if (options.overwrite) {
      mergedConversations = data.conversations || [];
    } else {
      // Get unique conversations by ID
      const existingIds = currentConversations.map(c => c.id);
      const newConversations = (data.conversations || []).filter(c => !existingIds.includes(c.id));
      mergedConversations = [...currentConversations, ...newConversations];
    }
    
    // Save the merged data
    await Promise.all([
      saveGlobalSettings(mergedGlobalSettings),
      saveChatSettings(mergedChatSettings),
      chrome.storage.sync.set({ conversations: mergedConversations })
    ]);
    
    return {
      success: true,
      globalSettings: mergedGlobalSettings,
      chatSettings: mergedChatSettings,
      conversations: mergedConversations.length
    };
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}
