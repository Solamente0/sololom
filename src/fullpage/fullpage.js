/**
 * Sololom - Full Page Chat Script
 * Handles the full page chat UI and functionality
 */

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const chatTitle = document.getElementById('chatTitle');
const modelLabel = document.getElementById('modelLabel');
const clearChatBtn = document.getElementById('clearChatBtn');
const exportChatBtn = document.getElementById('exportChatBtn');
const chatSettingsBtn = document.getElementById('chatSettingsBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const settingsBtn = document.getElementById('settingsBtn');
const aboutBtn = document.getElementById('aboutBtn');
const donateBtn = document.getElementById('donateBtn');
const newChatBtn = document.getElementById('newChatBtn');
const conversationsList = document.getElementById('conversationsList');

// Chat Settings Modal
const chatSettingsModal = document.getElementById('chatSettingsModal');
const closeModalBtn = document.querySelector('.close-btn');
const chatTitleInput = document.getElementById('chatTitleInput');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokensInput');
const systemPromptInput = document.getElementById('systemPromptInput');
const resetChatSettingsBtn = document.getElementById('resetChatSettingsBtn');
const saveChatSettingsBtn = document.getElementById('saveChatSettingsBtn');

// State
let conversation = [];
let conversations = [];
let currentConversationId = null;
let isProcessing = false;
let chatSettings = {};
let globalSettings = {};

// Auto-resize textarea
userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

// Initialize full page chat
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  await loadSettings();
  
  // Apply theme and appearance settings
  document.body.setAttribute('data-theme', globalSettings.theme || 'light');
  document.body.setAttribute('data-font-size', globalSettings.fontSize || 'medium');
  document.body.setAttribute('data-compact', globalSettings.compactMode ? 'true' : 'false');
  
  // Load conversations
  await loadConversations();
  
  // Check if there are saved conversations
  if (conversations.length > 0) {
    // Load the most recent conversation
    loadConversation(conversations[0].id);
  } else {
    // Start a new conversation
    startNewConversation();
  }
  
  // Set model select value
  modelSelect.value = chatSettings.model || 'gpt-3.5-turbo';
  modelLabel.textContent = getModelDisplayName(modelSelect.value);
  
  // Set chat settings form values
  populateChatSettingsForm();
  
  // Check if API key is set
  const provider = getProviderFromModel(modelSelect.value);
  const apiKey = globalSettings.apiKeys?.[provider];
  
  if (!apiKey) {
    displayErrorMessage('API key not set for the selected model. Please configure in settings.');
  }
  
  // Initialize empty state if no conversation is loaded
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
exportChatBtn.addEventListener('click', exportChat);
newChatBtn.addEventListener('click', startNewConversation);
settingsBtn.addEventListener('click', openSettings);
aboutBtn.addEventListener('click', openAboutPage);
donateBtn.addEventListener('click', openDonatePage);

// Toggle sidebar
toggleSidebarBtn.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('collapsed');
  
  if (sidebar.classList.contains('collapsed')) {
    toggleSidebarBtn.textContent = '▶';
  } else {
    toggleSidebarBtn.textContent = '◀';
  }
});

// Handle model change
modelSelect.addEventListener('change', () => {
  // Check if API key is set for selected model
  const provider = getProviderFromModel(modelSelect.value);
  const apiKey = globalSettings.apiKeys?.[provider];
  
  if (!apiKey) {
    displayErrorMessage('API key not set for selected model. Please configure in settings.');
  }
  
  // Update model label
  modelLabel.textContent = getModelDisplayName(modelSelect.value);
  
  // Update chat settings
  chatSettings.model = modelSelect.value;
  saveChatSettings();
});

// Chat settings modal
chatSettingsBtn.addEventListener('click', () => {
  populateChatSettingsForm();
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
saveChatSettingsBtn.addEventListener('click', () => {
  // Update chat title
  const newTitle = chatTitleInput.value.trim() || 'New Conversation';
  chatTitle.textContent = newTitle;
  
  // Update chat settings
  chatSettings.title = newTitle;
  chatSettings.temperature = parseFloat(temperatureSlider.value);
  chatSettings.maxTokens = parseInt(maxTokensInput.value);
  chatSettings.systemPrompt = systemPromptInput.value;
  
  // Save settings and update conversation in storage
  saveChatSettings();
  updateConversationsList();
  
  // Close modal
  chatSettingsModal.style.display = 'none';
  
  // Show toast
  showToast('Settings saved', 'success');
});

// Reset chat settings to defaults
resetChatSettingsBtn.addEventListener('click', () => {
  const defaultChatSettings = {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful assistant.',
    title: chatSettings.title || 'New Conversation'
  };
  
  // Update form values
  chatTitleInput.value = defaultChatSettings.title;
  temperatureSlider.value = defaultChatSettings.temperature;
  temperatureValue.textContent = defaultChatSettings.temperature;
  maxTokensInput.value = defaultChatSettings.maxTokens;
  systemPromptInput.value = defaultChatSettings.systemPrompt;
  
  // Update settings
  Object.assign(chatSettings, defaultChatSettings);
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
      apiKeys: {},
      fontSize: 'medium',
      compactMode: false,
      contextWindow: 0
    };
  }
  
  if (result.chatSettings) {
    chatSettings = result.chatSettings;
  } else {
    chatSettings = {
      model: globalSettings.defaultModel || 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful assistant.',
      title: 'New Conversation'
    };
  }
}

/**
 * Loads saved conversations from storage
 */
async function loadConversations() {
  const result = await chrome.storage.sync.get('conversations');
  conversations = result.conversations || [];
  
  // Update conversations list in sidebar
  updateConversationsList();
}

/**
 * Updates the conversations list in the sidebar
 */
function updateConversationsList() {
  conversationsList.innerHTML = '';
  
  conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    if (currentConversationId === conv.id) {
      item.classList.add('active');
    }
    
    // Get conversation title
    const title = conv.title || 'Untitled Conversation';
    
    // Get the first message content for the snippet
    let snippet = '';
    if (conv.messages && conv.messages.length > 0) {
      const userMessage = conv.messages.find(m => m.role === 'user');
      if (userMessage) {
        snippet = userMessage.content.substring(0, 40) + (userMessage.content.length > 40 ? '...' : '');
      }
    }
    
    // Format date
    const date = new Date(conv.timestamp).toLocaleDateString();
    
    item.innerHTML = `
      <div class="conversation-title">${title}</div>
      ${snippet ? `<div class="conversation-snippet">${snippet}</div>` : ''}
      <div class="conversation-date">${date}</div>
    `;
    
    item.addEventListener('click', () => {
      loadConversation(conv.id);
    });
    
    conversationsList.appendChild(item);
  });
}

/**
 * Loads a conversation from the saved list
 * @param {string} id - Conversation ID
 */
function loadConversation(id) {
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;
  
  // Set current conversation ID
  currentConversationId = id;
  
  // Load conversation data
  conversation = conv.messages || [];
  chatSettings = {
    model: conv.model || globalSettings.defaultModel || 'gpt-3.5-turbo',
    temperature: conv.temperature || 0.7,
    maxTokens: conv.maxTokens || 2048,
    systemPrompt: conv.systemPrompt || 'You are a helpful assistant.',
    title: conv.title || 'Untitled Conversation'
  };
  
  // Update UI
  chatTitle.textContent = chatSettings.title;
  modelSelect.value = chatSettings.model;
  modelLabel.textContent = getModelDisplayName(chatSettings.model);
  
  // Clear chat messages and add conversation messages
  chatMessages.innerHTML = '';
  conversation.forEach(msg => {
    if (msg.role !== 'system') {
      addMessageToUI(msg.role, msg.content);
    }
  });
  
  // Update conversations list
  updateConversationsList();
  
  // If no messages, show empty state
  if (conversation.filter(msg => msg.role !== 'system').length === 0) {
    showEmptyState();
  }
}

/**
 * Starts a new conversation
 */
function startNewConversation() {
  // Generate unique ID
  const id = Date.now().toString();
  
  // Set current conversation ID
  currentConversationId = id;
  
  // Clear conversation
  conversation = [];
  
  // Set default settings
  chatSettings = {
    model: globalSettings.defaultModel || 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful assistant.',
    title: 'New Conversation'
  };
  
  // Update UI
  chatTitle.textContent = chatSettings.title;
  modelSelect.value = chatSettings.model;
  modelLabel.textContent = getModelDisplayName(chatSettings.model);
  chatMessages.innerHTML = '';
  
  // Show empty state
  showEmptyState();
  
  // Create new conversation entry
  const newConversation = {
    id,
    title: chatSettings.title,
    model: chatSettings.model,
    systemPrompt: chatSettings.systemPrompt,
    temperature: chatSettings.temperature,
    maxTokens: chatSettings.maxTokens,
    messages: [],
    timestamp: Date.now()
  };
  
  // Add to conversations list
  conversations.unshift(newConversation);
  
  // Limit the number of saved conversations
  const maxConversations = globalSettings.maxConversations || 100;
  if (conversations.length > maxConversations) {
    conversations = conversations.slice(0, maxConversations);
  }
  
  // Save to storage
  chrome.storage.sync.set({ conversations });
  
  // Update conversations list in sidebar
  updateConversationsList();
}

/**
 * Saves current chat settings and conversation
 */
function saveChatSettings() {
  // Update the current conversation in the list
  const index = conversations.findIndex(c => c.id === currentConversationId);
  if (index !== -1) {
    conversations[index] = {
      ...conversations[index],
      title: chatSettings.title,
      model: chatSettings.model,
      systemPrompt: chatSettings.systemPrompt,
      temperature: chatSettings.temperature,
      maxTokens: chatSettings.maxTokens,
      messages: conversation,
      timestamp: Date.now()
    };
    
    // Save to storage
    chrome.storage.sync.set({ conversations });
  }
  
  // Also save current chat settings for new chats
  chrome.storage.sync.set({ chatSettings });
}

/**
 * Populates the chat settings form with current values
 */
function populateChatSettingsForm() {
  chatTitleInput.value = chatSettings.title || 'New Conversation';
  temperatureSlider.value = chatSettings.temperature || 0.7;
  temperatureValue.textContent = chatSettings.temperature || 0.7;
  maxTokensInput.value = chatSettings.maxTokens || 2048;
  systemPromptInput.value = chatSettings.systemPrompt || 'You are a helpful assistant.';
}

/**
 * Send a message to the LLM
 */
async function sendMessage() {
  const userMessage = userInput.value.trim();
  
  if (!userMessage || isProcessing) return;
  
  isProcessing = true;
  sendBtn.disabled = true;
  
  // Clear input and reset height
  userInput.value = '';
  userInput.style.height = 'auto';
  
  // Remove empty state if present
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
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
    
    // Add conversation history, respecting context window limit
    let historyMessages = [...conversation];
    const contextLimit = globalSettings.contextWindow;
    
    if (contextLimit > 0 && historyMessages.length > contextLimit) {
      // Keep system message if present
      const systemMessage = historyMessages.find(m => m.role === 'system');
      
      // Get the most recent messages up to the limit
      historyMessages = historyMessages
        .filter(m => m.role !== 'system')
        .slice(-contextLimit);
      
      // Add back the system message if it existed
      if (systemMessage) {
        historyMessages.unshift(systemMessage);
      }
    }
    
    // Add filtered history
    historyMessages.forEach(msg => {
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
      
      // Update conversation title if it's still the default
      if (chatSettings.title === 'New Conversation') {
        // Generate a title from the first user message
        let title = userMessage.substring(0, 30);
        if (userMessage.length > 30) title += '...';
        chatSettings.title = title;
        chatTitle.textContent = title;
      }
      
      // Save conversation
      saveChatSettings();
      updateConversationsList();
    } else {
      // Handle error
      displayErrorMessage(response.error || 'Error getting response');
    }
  } catch (error) {
    removeTypingIndicator();
    displayErrorMessage(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

/**
 * Adds a message to the UI
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 */
function addMessageToUI(role, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${role}`;
  
  const bubbleElement = document.createElement('div');
  bubbleElement.className = 'message-bubble';
  
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
  
  bubbleElement.innerHTML = content;
  messageElement.appendChild(bubbleElement);
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
  errorElement.className = 'message-error';
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
      <h3>Start a New Conversation</h3>
      <p>Choose a model and start chatting with an AI assistant.</p>
    </div>
  `;
}

/**
 * Clears the chat
 */
function clearChat() {
  if (confirm('Are you sure you want to clear this conversation? This cannot be undone.')) {
    // Keep system message if present
    const systemMessage = conversation.find(msg => msg.role === 'system');
    
    // Reset conversation to only system message (if it exists)
    conversation = systemMessage ? [systemMessage] : [];
    
    // Clear UI
    chatMessages.innerHTML = '';
    
    // Show empty state
    showEmptyState();
    
    // Save changes
    saveChatSettings();
  }
}

/**
 * Exports the chat as a JSON or Markdown file
 */
function exportChat() {
  const exportOptions = ['JSON', 'Markdown', 'Text'];
  const format = prompt(`Choose export format (${exportOptions.join(', ')}):`, 'Markdown');
  
  if (!format || !exportOptions.map(o => o.toLowerCase()).includes(format.toLowerCase())) {
    return;
  }
  
  let content = '';
  let filename = `${chatSettings.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
  let mimetype = '';
  
  switch (format.toLowerCase()) {
    case 'json':
      content = JSON.stringify({
        title: chatSettings.title,
        model: chatSettings.model,
        systemPrompt: chatSettings.systemPrompt,
        temperature: chatSettings.temperature,
        maxTokens: chatSettings.maxTokens,
        messages: conversation.filter(msg => msg.role !== 'system'),
        timestamp: Date.now()
      }, null, 2);
      filename += '.json';
      mimetype = 'application/json';
      break;
      
    case 'markdown':
      content = `# ${chatSettings.title}\n\n`;
      content += `Model: ${getModelDisplayName(chatSettings.model)}\n`;
      content += `Date: ${new Date().toLocaleString()}\n\n`;
      
      if (chatSettings.systemPrompt) {
        content += `System Prompt: ${chatSettings.systemPrompt}\n\n`;
      }
      
      content += '---\n\n';
      
      conversation.forEach(msg => {
        if (msg.role !== 'system') {
          content += `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n${msg.content}\n\n`;
        }
      });
      
      filename += '.md';
      mimetype = 'text/markdown';
      break;
      
    case 'text':
      conversation.forEach(msg => {
        if (msg.role !== 'system') {
          content += `${msg.role === 'user' ? 'You' : 'Assistant'}:\n${msg.content}\n\n`;
        }
      });
      
      filename += '.txt';
      mimetype = 'text/plain';
      break;
  }
  
  const blob = new Blob([content], { type: mimetype });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
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