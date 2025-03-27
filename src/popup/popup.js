/**
 * Sololom - Popup Script
 * Handles popup UI and chat functionality
 */

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const clearChatBtn = document.getElementById('clearChatBtn');
const settingsBtn = document.getElementById('settingsBtn');
const fullPageBtn = document.getElementById('fullPageBtn');
const aboutBtn = document.getElementById('aboutBtn');
const donateBtn = document.getElementById('donateBtn');
const chatSettingsBtn = document.getElementById('chatSettingsBtn');
const chatSettingsModal = document.getElementById('chatSettingsModal');
const closeModalBtn = document.querySelector('.close-btn');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokensInput');
const systemPromptInput = document.getElementById('systemPromptInput');
const resetChatSettingsBtn = document.getElementById('resetChatSettingsBtn');
const saveChatSettingsBtn = document.getElementById('saveChatSettingsBtn');

// State
let conversation = [];
let isProcessing = false;
let chatSettings = {};
let globalSettings = {};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  await loadSettings();
  
  // Apply theme
  document.body.setAttribute('data-theme', globalSettings.theme || 'light');
  
  // Set model select value
  modelSelect.value = chatSettings.model || 'gpt-3.5-turbo';
  
  // Set chat settings form values
  temperatureSlider.value = chatSettings.temperature || 0.7;
  temperatureValue.textContent = chatSettings.temperature || 0.7;
  maxTokensInput.value = chatSettings.maxTokens || 2048;
  systemPromptInput.value = chatSettings.systemPrompt || 'You are a helpful assistant.';
  
  // Check if API key is set
  const provider = getProviderFromModel(modelSelect.value);
  const apiKey = globalSettings.apiKeys?.[provider];
  
  if (!apiKey) {
    displayErrorMessage('API key not set. Please configure in settings.');
  }
  
  // Initialize empty state
  if (conversation.length === 0) {
    showEmptyState();
  }
});

// Event Listeners
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);
clearChatBtn.addEventListener('click', clearChat);
fullPageBtn.addEventListener('click', openFullPage);
settingsBtn.addEventListener('click', openSettings);
aboutBtn.addEventListener('click', openAboutPage);
donateBtn.addEventListener('click', openDonatePage);

// Chat settings modal
chatSettingsBtn.addEventListener('click', () => {
  chatSettingsModal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
  chatSettingsModal.style.display = 'none';
});

// Click outside modal to close
window.addEventListener('click', (e) => {
  if (e.target === chatSettingsModal) {
    chatSettingsModal.style.display = 'none';
  }
});

// Update temperature value display
temperatureSlider.addEventListener('input', () => {
  temperatureValue.textContent = temperatureSlider.value;
});

// Save chat settings
saveChatSettingsBtn.addEventListener('click', async () => {
  // Update chat settings
  chatSettings.temperature = parseFloat(temperatureSlider.value);
  chatSettings.maxTokens = parseInt(maxTokensInput.value);
  chatSettings.systemPrompt = systemPromptInput.value;
  
  // Save to storage
  await chrome.storage.sync.set({ chatSettings });
  
  // Close modal
  chatSettingsModal.style.display = 'none';
});

// Reset chat settings to defaults
resetChatSettingsBtn.addEventListener('click', async () => {
  const defaultChatSettings = {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful assistant.',
    saveHistory: true,
    maxHistoryItems: 100
  };
  
  // Update form values
  temperatureSlider.value = defaultChatSettings.temperature;
  temperatureValue.textContent = defaultChatSettings.temperature;
  maxTokensInput.value = defaultChatSettings.maxTokens;
  systemPromptInput.value = defaultChatSettings.systemPrompt;
  
  // Update settings
  chatSettings = defaultChatSettings;
  
  // Save to storage
  await chrome.storage.sync.set({ chatSettings });
});

// Handle model change
modelSelect.addEventListener('change', () => {
  // Check if API key is set for selected model
  const provider = getProviderFromModel(modelSelect.value);
  const apiKey = globalSettings.apiKeys?.[provider];
  
  if (!apiKey) {
    displayErrorMessage('API key not set for selected model. Please configure in settings.');
  }
  
  // Update chat settings
  chatSettings.model = modelSelect.value;
  chrome.storage.sync.set({ chatSettings });
});

/**
 * Loads settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.sync.get(['globalSettings', 'chatSettings']);
  
  if (result.globalSettings) {
    globalSettings = result.globalSettings;
  } else {
    globalSettings = {
      theme: 'light',
      defaultModel: 'gpt-3.5-turbo',
      apiKeys: {}
    };
  }
  
  if (result.chatSettings) {
    chatSettings = result.chatSettings;
  } else {
    chatSettings = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful assistant.',
      saveHistory: true,
      maxHistoryItems: 100
    };
  }
}

/**
 * Send a message to the LLM
 */
async function sendMessage() {
  const userMessage = userInput.value.trim();
  
  if (!userMessage || isProcessing) return;
  
  isProcessing = true;
  
  // Clear input
  userInput.value = '';
  
  // Add user message to UI
  addMessageToUI('user', userMessage);
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    // Prepare messages array with system prompt
    let messages = [];
    
    // Add system message if present
    if (chatSettings.systemPrompt) {
      messages.push({
        role: 'system',
        content: chatSettings.systemPrompt
      });
    }
    
    // Add conversation history
    conversation.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Store in conversation
    conversation.push({
      role: 'user',
      content: userMessage
    });
    
    // Call LLM API
    const response = await chrome.runtime.sendMessage({
      action: 'getLLMResponse',
      data: {
        model: chatSettings.model || 'gpt-3.5-turbo',
        messages: messages,
        temperature: chatSettings.temperature || 0.7,
        maxTokens: chatSettings.maxTokens || 2048
      }
    });
    
    // Remove typing indicator
    removeTypingIndicator();
    
    if (response.success) {
      // Handle different API response formats
      let assistantMessage;
      
      if (response.data.choices && response.data.choices[0]) {
        // OpenAI format
        assistantMessage = response.data.choices[0].message.content;
      } else if (response.data.content) {
        // Anthropic format
        assistantMessage = response.data.content[0].text;
      } else {
        assistantMessage = 'Received response in unknown format.';
      }
      
      // Add assistant message to UI
      addMessageToUI('assistant', assistantMessage);
      
      // Store in conversation
      conversation.push({
        role: 'assistant',
        content: assistantMessage
      });
      
      // Save conversation if enabled
      if (chatSettings.saveHistory) {
        chrome.runtime.sendMessage({
          action: 'saveConversation',
          data: {
            model: chatSettings.model,
            messages: conversation,
            timestamp: Date.now()
          }
        });
      }
    } else {
      // Handle error
      displayErrorMessage(response.error || 'Error getting response');
    }
  } catch (error) {
    removeTypingIndicator();
    displayErrorMessage(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

/**
 * Adds a message to the UI
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 */
function addMessageToUI(role, content) {
  // Remove empty state if present
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${role}`;
  
  // Simple markdown-like formatting for assistant messages
  if (role === 'assistant') {
    // Replace code blocks
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Replace inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace bold
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace links
    content = content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Replace line breaks with paragraphs
    const paragraphs = content.split('\n\n');
    content = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  } else {
    // For user messages, just replace newlines with <br>
    content = `<p>${content.replace(/\n/g, '<br>')}</p>`;
  }
  
  messageElement.innerHTML = content;
  chatMessages.appendChild(messageElement);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Shows typing indicator
 */
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  indicator.id = 'typingIndicator';
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Removes typing indicator
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Displays an error message
 * @param {string} message - Error message
 */
function displayErrorMessage(message) {
  removeTypingIndicator();
  
  const errorElement = document.createElement('div');
  errorElement.className = 'message message-error';
  errorElement.textContent = `Error: ${message}`;
  chatMessages.appendChild(errorElement);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Shows the empty state
 */
function showEmptyState() {
  chatMessages.innerHTML = `
    <div class="empty-state">
      <h3>Welcome to Sololom!</h3>
      <p>Start a conversation with an AI assistant.</p>
    </div>
  `;
}

/**
 * Clears the chat
 */
function clearChat() {
  // Clear UI
  chatMessages.innerHTML = '';
  
  // Reset conversation
  conversation = [];
  
  // Show empty state
  showEmptyState();
}

/**
 * Opens the full page chat
 */
function openFullPage() {
  chrome.runtime.sendMessage({ action: 'openFullPage' });
}

/**
 * Opens the settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Opens the about page
 */
function openAboutPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/about/about.html') });
}

/**
 * Opens the donate page
 */
function openDonatePage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/about/about.html#donate') });
}

/**
 * Gets the provider from the model name
 * @param {string} model - Model name
 * @returns {string} - Provider name
 */
function getProviderFromModel(model) {
  if (model.startsWith('gpt')) return 'openai';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('mistral')) return 'mistral';
  return 'unknown';
}
