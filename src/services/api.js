/**
 * Sololom API Service
 *
 * Provides functions for interacting with LLM APIs
 */

import * as SettingsService from "./settings.js";
import { getProviderFromModel } from "../utils/helpers.js";

/**
 * Gets a response from the appropriate LLM API
 *
 * @param {Object} params - The request parameters
 * @param {string} params.model - The model to use
 * @param {Array} params.messages - The conversation messages
 * @param {number} params.temperature - The sampling temperature
 * @param {number} params.maxTokens - The maximum number of tokens to generate
 * @returns {Promise<Object>} - The API response
 */
export async function getLLMResponse(params) {
  // Determine the provider based on the model
  const provider = getProviderFromModel(params.model);

  // Get the API key from settings
  const apiKey = await SettingsService.getGlobalSetting(
    `apiKeys.${provider}`,
    ""
  );

  if (!apiKey) {
    throw new Error(
      `API key not configured for ${provider}. Please check settings.`
    );
  }

  // Call the appropriate API based on the provider
  switch (provider) {
    case "openai":
      return callOpenAI(params, apiKey);
    case "anthropic":
      return callAnthropic(params, apiKey);
    case "mistral":
      return callMistral(params, apiKey);
    case "openrouter":
      return callOpenRouter(params, apiKey);
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

/**
 * Calls the OpenAI API
 *
 * @param {Object} params - The request parameters
 * @param {string} apiKey - The OpenAI API key
 * @returns {Promise<Object>} - The API response
 */
async function callOpenAI(params, apiKey) {
  const url = "https://api.openai.com/v1/chat/completions";

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
    }),
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API Error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes("API Error")) {
      throw error;
    }
    throw new Error(`Failed to call OpenAI API: ${error.message}`);
  }
}

/**
 * Calls the Anthropic API
 *
 * @param {Object} params - The request parameters
 * @param {string} apiKey - The Anthropic API key
 * @returns {Promise<Object>} - The API response
 */
async function callAnthropic(params, apiKey) {
  const url = "https://api.anthropic.com/v1/messages";

  // Transform messages to Anthropic format
  const systemPrompt =
    params.messages.find((m) => m.role === "system")?.content || "";
  const userMessages = params.messages.filter((m) => m.role !== "system");

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      messages: userMessages,
      system: systemPrompt,
      max_tokens: params.maxTokens || 2048,
      temperature: params.temperature || 0.7,
    }),
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Anthropic API Error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes("API Error")) {
      throw error;
    }
    throw new Error(`Failed to call Anthropic API: ${error.message}`);
  }
}

/**
 * Calls the Mistral API
 *
 * @param {Object} params - The request parameters
 * @param {string} apiKey - The Mistral API key
 * @returns {Promise<Object>} - The API response
 */
async function callMistral(params, apiKey) {
  const url = "https://api.mistral.ai/v1/chat/completions";

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
    }),
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Mistral API Error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes("API Error")) {
      throw error;
    }
    throw new Error(`Failed to call Mistral API: ${error.message}`);
  }
}
/**
 * Calls the OpenRouter API
 *
 * @param {Object} params - The request parameters
 * @param {string} apiKey - The OpenRouter API key
 * @returns {Promise<Object>} - The API response
 */
async function callOpenRouter(params, apiKey) {
  const url = "https://openrouter.ai/api/v1/chat/completions";

  // Extract the actual model name if it has the openrouter/ prefix
  const modelName = params.model.startsWith("openrouter/")
    ? params.model.substring("openrouter/".length)
    : params.model;

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/omidnateghi/sololom", // Your app's website
      "X-Title": "Sololom Extension", // Your app's name
    },
    body: JSON.stringify({
      model: modelName,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2048,
    }),
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenRouter API Error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes("API Error")) {
      throw error;
    }
    throw new Error(`Failed to call OpenRouter API: ${error.message}`);
  }
}
/**
 * Extracts the content from an API response
 *
 * @param {Object} response - The API response
 * @param {string} provider - The provider name
 * @returns {string} - The extracted content
 */
export function extractContentFromResponse(response, provider) {
  if (!response) return "";

  switch (provider) {
    case "openai":
      return response.choices?.[0]?.message?.content || "";
    case "anthropic":
      return response.content?.[0]?.text || "";
    case "mistral":
      return response.choices?.[0]?.message?.content || "";
    case "openrouter":
      return response.choices?.[0]?.message?.content || "";
    default:
      return "";
  }
}

/**
 * Gets the available models for a provider
 *
 * @param {string} provider - The provider name
 * @returns {Array<Object>} - Array of model objects with id and name
 */
export function getAvailableModels(provider) {
  switch (provider) {
    case "openai":
      return [
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      ];
    case "anthropic":
      return [
        { id: "claude-2.1", name: "Claude 2.1" },
        { id: "claude-3-opus", name: "Claude 3 Opus" },
        { id: "claude-3-sonnet", name: "Claude 3 Sonnet" },
      ];
    case "mistral":
      return [
        { id: "mistral-small", name: "Mistral Small" },
        { id: "mistral-medium", name: "Mistral Medium" },
        { id: "mistral-large", name: "Mistral Large" },
      ];
    case "openrouter":
      return [
        // Latest OpenRouter models (as of March 2025)
        {
          id: "openrouter/meta-llama-3-70b-instruct",
          name: "Meta Llama 3 70B",
        },
        { id: "openrouter/meta-llama-3-8b-instruct", name: "Meta Llama 3 8B" },
        { id: "openrouter/google/gemini-pro", name: "Google Gemini Pro" },
        {
          id: "openrouter/google/gemini-1.5-pro",
          name: "Google Gemini 1.5 Pro",
        },
        {
          id: "openrouter/anthropic/claude-3-opus",
          name: "Claude 3 Opus (via OpenRouter)",
        },
        {
          id: "openrouter/anthropic/claude-3-sonnet",
          name: "Claude 3 Sonnet (via OpenRouter)",
        },
        {
          id: "openrouter/anthropic/claude-3-haiku",
          name: "Claude 3 Haiku (via OpenRouter)",
        },
        { id: "openrouter/cohere/command-r", name: "Cohere Command R" },
        {
          id: "openrouter/mistral/mistral-large",
          name: "Mistral Large (via OpenRouter)",
        },
        {
          id: "openrouter/mistral/mistral-small",
          name: "Mistral Small (via OpenRouter)",
        },
      ];
    default:
      return [];
  }
}

/**
 * Gets all available models across providers
 *
 * @returns {Array<Object>} - Array of model objects with id, name, and provider
 */
export function getAllAvailableModels() {
  return [
    ...getAvailableModels("openai").map((model) => ({
      ...model,
      provider: "openai",
    })),
    ...getAvailableModels("anthropic").map((model) => ({
      ...model,
      provider: "anthropic",
    })),
    ...getAvailableModels("mistral").map((model) => ({
      ...model,
      provider: "mistral",
    })),
  ];
}

/**
 * Checks if an API key is valid by making a test request
 *
 * @param {string} provider - The provider name
 * @param {string} apiKey - The API key to test
 * @returns {Promise<Object>} - Result object with success boolean and message
 */
export async function testApiKey(provider, apiKey) {
  if (!apiKey) {
    return { success: false, message: "API key is empty" };
  }

  try {
    let response;

    switch (provider) {
      case "openai":
        // Use a simple models list request to test the key
        response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        break;

      case "anthropic":
        // Anthropic doesn't have a simple endpoint for testing keys
        // Use a minimal completion request instead
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-sonnet",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 1,
          }),
        });
        break;

      case "mistral":
        // Use a models list request to test the key
        response = await fetch("https://api.mistral.ai/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        break;
      case "openrouter":
        // Use models list endpoint to test key
        response = await fetch("https://openrouter.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://github.com/omidnateghi/sololom",
            "X-Title": "Sololom Extension",
          },
        });
        break;
      default:
        return { success: false, message: `Unsupported provider: ${provider}` };
    }

    if (response.ok) {
      return { success: true, message: "API key is valid" };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `Invalid API key: ${
          errorData.error?.message || response.statusText
        }`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error testing API key: ${error.message}`,
    };
  }
}
