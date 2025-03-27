/**
 * Sololom - Background Service Worker
 * Handles extension lifecycle events and background operations
 */

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    // Set default global settings
    const defaultGlobalSettings = {
      theme: "light",
      defaultModel: "gpt-3.5-turbo",
      apiKeys: {
        openai: "",
        anthropic: "",
        mistral: "",
      },
      shortcuts: {
        popup: "Alt+L",
        fullpage: "Alt+Shift+L",
      },
    };

    // Set default chat settings
    const defaultChatSettings = {
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: "You are a helpful assistant.",
      saveHistory: true,
      maxHistoryItems: 100,
    };

    // Save default settings to storage
    await chrome.storage.sync.set({
      globalSettings: defaultGlobalSettings,
      chatSettings: defaultChatSettings,
      conversations: [],
    });

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/about/about.html"),
    });
  }
});

// Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_fullpage") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/fullpage/fullpage.html"),
    });
  }
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message types
  switch (message.action) {
    case "getLLMResponse":
      // Process request to get LLM response
      fetchLLMResponse(message.data)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true; // Indicates async response

    case "saveConversation":
      // Save conversation to storage
      saveConversation(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "openFullPage":
      // Open full-page chat
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/fullpage/fullpage.html"),
      });
      sendResponse({ success: true });
      return false;
  }
});

/**
 * Fetches a response from the selected LLM API
 * @param {Object} data - Request data including messages, model, etc.
 * @returns {Promise<Object>} - The LLM response
 */
async function fetchLLMResponse(data) {
  // Get API settings from storage
  const { globalSettings } = await chrome.storage.sync.get("globalSettings");
  const apiKey = globalSettings.apiKeys[getProviderFromModel(data.model)];

  if (!apiKey) {
    throw new Error(
      "API key not configured for this model. Please check settings."
    );
  }

  // Determine which API to call based on the model
  let response;
  switch (getProviderFromModel(data.model)) {
    case "openai":
      response = await fetchFromOpenAI(data, apiKey);
      break;
    case "anthropic":
      response = await fetchFromAnthropic(data, apiKey);
      break;
    case "mistral":
      response = await fetchFromMistral(data, apiKey);
      break;
    default:
      throw new Error("Unsupported model provider");
  }

  return response;
}

/**
 * Determines the provider from the model name
 * @param {string} model - The model name
 * @returns {string} - The provider name (openai, anthropic, mistral)
 */
function getProviderFromModel(model) {
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("mistral")) return "mistral";
  // For OpenRouter models, you can use a prefix or specific model identifiers
  if (
    model.startsWith("openrouter/") ||
    model.includes("llama") ||
    model.includes("gemini") ||
    model.includes("meta") ||
    model.includes("cohere") ||
    model.includes("palm")
  )
    return "openrouter";
  return "unknown";
}

/**
 * Fetch response from OpenAI API
 * @param {Object} data - Request data
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} - The OpenAI response
 */
async function fetchFromOpenAI(data, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: data.model,
      messages: data.messages,
      temperature: data.temperature || 0.7,
      max_tokens: data.maxTokens || 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `OpenAI API Error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  return response.json();
}

/**
 * Fetch response from Anthropic API
 * @param {Object} data - Request data
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} - The Anthropic response
 */
async function fetchFromAnthropic(data, apiKey) {
  // Transform messages to Anthropic format
  const systemPrompt =
    data.messages.find((m) => m.role === "system")?.content || "";
  const userMessages = data.messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: data.model,
      messages: userMessages,
      system: systemPrompt,
      max_tokens: data.maxTokens || 2048,
      temperature: data.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Anthropic API Error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  return response.json();
}

/**
 * Fetch response from Mistral API
 * @param {Object} data - Request data
 * @param {string} apiKey - Mistral API key
 * @returns {Promise<Object>} - The Mistral response
 */
async function fetchFromMistral(data, apiKey) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: data.model,
      messages: data.messages,
      temperature: data.temperature || 0.7,
      max_tokens: data.maxTokens || 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Mistral API Error: ${errorData.error?.message || "Unknown error"}`
    );
  }

  return response.json();
}

/**
 * Saves a conversation to storage
 * @param {Object} conversation - The conversation to save
 * @returns {Promise<void>}
 */
async function saveConversation(conversation) {
  // Add timestamp if not present
  if (!conversation.timestamp) {
    conversation.timestamp = Date.now();
  }

  // Get existing conversations
  const { conversations, chatSettings } = await chrome.storage.sync.get([
    "conversations",
    "chatSettings",
  ]);
  const maxHistory = chatSettings.maxHistoryItems || 100;

  // Add new conversation and limit to max history size
  const updatedConversations = [conversation, ...conversations].slice(
    0,
    maxHistory
  );

  // Save updated conversations
  await chrome.storage.sync.set({ conversations: updatedConversations });
}
