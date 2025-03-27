/**
 * Sololom Chat Component
 * 
 * Reusable chat component for communicating with LLMs
 * Can be used in both popup and full-page modes
 */

import * as ApiService from '../services/api.js';
import * as StorageService from '../services/storage.js';
import * as SettingsService from '../services/settings.js';
import { getProviderFromModel, renderMarkdown, showToast } from '../utils/helpers.js';

export default class Chat {
  /**
   * Creates a new Chat instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.containerSelector - CSS selector for the chat container
   * @param {string} options.inputSelector - CSS selector for the input element
   * @param {string} options.sendButtonSelector - CSS selector for the send button
   * @param {string} options.messagesSelector - CSS selector for the messages container
   * @param {Function} options.onSendMessage - Callback when a message is sent
   * @param {Function} options.onReceiveMessage - Callback when a message is received
   * @param {Function} options.onError - Callback when an error occurs
   * @param {boolean} options.saveHistory - Whether to save chat history
   * @param {string} options.conversationId - ID of the conversation (optional)
   */
  constructor(options) {
    this.options = {
      saveHistory: true,
      ...options
    };
    
    // DOM elements
    this.container = document.querySelector(options.containerSelector);
    this.input = document.querySelector(options.inputSelector);
    this.sendButton = document.querySelector(options.sendButtonSelector);
    this.messagesContainer = document.querySelector(options.messagesSelector);
    
    // State
    this.conversation = [];
    this.conversationId = options.conversationId || Date.now().toString();
    this.isProcessing = false;
    this.chatSettings = {};
    this.globalSettings = {};
    
    // Bind methods
    this.sendMessage = this.sendMessage.bind(this);
    this.handleInputKeydown = this.handleInputKeydown.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initializes the chat component
   */
  async init() {
    try {
      // Load settings
      [this.globalSettings, this.chatSettings] = await Promise.all([
        SettingsService.getGlobalSettings(),
        SettingsService.getChatSettings()
      ]);
      
      // If conversation ID is provided, load the conversation
      if (this.options.conversationId) {
        const conversation = await StorageService.getConversationById(this.options.conversationId);
        if (conversation) {
          this.conversation = conversation.messages || [];
          this.chatSettings = {
            model: conversation.model || this.chatSettings.model,
            temperature: conversation.temperature || this.chatSettings.temperature,
            maxTokens: conversation.maxTokens || this.chatSettings.maxTokens,
            systemPrompt: conversation.systemPrompt || this.chatSettings.systemPrompt,
            title: conversation.title || 'New Conversation'
          };
          
          // Render conversation messages
          this.renderConversation();
        }
      }
      
      // Add event listeners
      this.sendButton.addEventListener('click', this.sendMessage);
      this.input.addEventListener('keydown', this.handleInputKeydown);
      
      // Auto-resize textarea if available
      if (this.input.tagName === 'TEXTAREA') {
        this.input.addEventListener('input', () => {
          this.input.style.height = 'auto';
          this.input.style.height = `${this.input.scrollHeight}px`;
        });
      }
      
      // If there are no messages, show empty state
      if (this.conversation.filter(msg => msg.role !== 'system').length === 0) {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }
  
  /**
   * Handles keydown events in the input field
   * 
   * @param {KeyboardEvent} event - The keydown event
   */
  handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  /**
   * Sends a message to the LLM
   */
  async sendMessage() {
    const userMessage = this.input.value.trim();
    
    if (!userMessage || this.isProcessing) return;
    
    this.isProcessing = true;
    this.sendButton.disabled = true;
    
    // Clear input
    this.input.value = '';
    if (this.input.tagName === 'TEXTAREA') {
      this.input.style.height = 'auto';
    }
    
    // Remove empty state if present
    this.clearEmptyState();
    
    // Add user message to UI
    this.addMessageToUI('user', userMessage);
    
    // Show typing indicator
    this.showTypingIndicator();
    
    try {
      // Prepare messages array with system prompt
      let messages = [];
      
      // Add system message if present
      if (this.chatSettings.systemPrompt) {
        messages.push({
          role: 'system',
          content: this.chatSettings.systemPrompt
        });
      }
      
      // Add conversation history, respecting context window limit
      let historyMessages = [...this.conversation];
      const contextLimit = this.globalSettings.contextWindow;
      
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
      this.conversation.push({
        role: 'user',
        content: userMessage
      });
      
      // Call LLM API
      const response = await ApiService.getLLMResponse({
        model: this.chatSettings.model || 'gpt-3.5-turbo',
        messages: messages,
        temperature: this.chatSettings.temperature || 0.7,
        maxTokens: this.chatSettings.maxTokens || 2048
      });
      
      // Remove typing indicator
      this.removeTypingIndicator();
      
      // Extract content from response based on provider
      const provider = getProviderFromModel(this.chatSettings.model);
      const assistantMessage = ApiService.extractContentFromResponse(response, provider);
      
      if (assistantMessage) {
        // Add assistant message to UI
        this.addMessageToUI('assistant', assistantMessage);
        
        // Store in conversation
        this.conversation.push({
          role: 'assistant',
          content: assistantMessage
        });
        
        // Callback when message is received
        if (this.options.onReceiveMessage) {
          this.options.onReceiveMessage(assistantMessage, response);
        }
        
        // Save conversation if enabled
        if (this.options.saveHistory && this.globalSettings.saveConversations !== false) {
          this.saveConversation();
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.removeTypingIndicator();
      this.displayErrorMessage(error.message || 'An error occurred');
      
      if (this.options.onError) {
        this.options.onError(error);
      }
    } finally {
      this.isProcessing = false;
      this.sendButton.disabled = false;
      this.input.focus();
    }
  }
  
  /**
   * Adds a message to the UI
   * 
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addMessageToUI(role, content) {
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${role}`;
    
    const bubbleElement = document.createElement('div');
    bubbleElement.className = 'message-bubble';
    
    // Format content
    if (role === 'assistant') {
      bubbleElement.innerHTML = renderMarkdown(content);
    } else {
      // For user messages, just replace newlines with <br>
      bubbleElement.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;
    }
    
    messageElement.appendChild(bubbleElement);
    this.messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    this.scrollToBottom();
    
    // Callback when message is sent
    if (role === 'user' && this.options.onSendMessage) {
      this.options.onSendMessage(content);
    }
  }
  
  /**
   * Shows typing indicator
   */
  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    indicator.id = 'typingIndicator';
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }
  
  /**
   * Removes typing indicator
   */
  removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  /**
   * Displays an error message
   * 
   * @param {string} message - Error message
   */
  displayErrorMessage(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'message-error';
    errorElement.textContent = `Error: ${message}`;
    this.messagesContainer.appendChild(errorElement);
    this.scrollToBottom();
  }
  
  /**
   * Shows the empty state
   */
  showEmptyState() {
    // Only show if there are no messages
    if (this.messagesContainer.children.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <h3>Start a New Conversation</h3>
        <p>Choose a model and start chatting with an AI assistant.</p>
      `;
      this.messagesContainer.appendChild(emptyState);
    }
  }
  
  /**
   * Clears the empty state
   */
  clearEmptyState() {
    const emptyState = this.messagesContainer.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }
  
  /**
   * Renders the conversation messages
   */
  renderConversation() {
    // Clear messages container
    this.messagesContainer.innerHTML = '';
    
    // Add messages
    this.conversation.forEach(msg => {
      if (msg.role !== 'system') {
        this.addMessageToUI(msg.role, msg.content);
      }
    });
  }
  
  /**
   * Saves the conversation
   */
  async saveConversation() {
    try {
      // Prepare conversation object
      const conversation = {
        id: this.conversationId,
        title: this.chatSettings.title || 'New Conversation',
        model: this.chatSettings.model,
        systemPrompt: this.chatSettings.systemPrompt,
        temperature: this.chatSettings.temperature,
        maxTokens: this.chatSettings.maxTokens,
        messages: this.conversation,
        timestamp: Date.now()
      };
      
      // Save to storage
      await StorageService.saveConversation(conversation);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }
  
  /**
   * Clears the chat
   */
  clearChat() {
    // Keep system message if present
    const systemMessage = this.conversation.find(msg => msg.role === 'system');
    
    // Reset conversation to only system message (if it exists)
    this.conversation = systemMessage ? [systemMessage] : [];
    
    // Clear UI
    this.messagesContainer.innerHTML = '';
    
    // Show empty state
    this.showEmptyState();
    
    // Save changes if history is enabled
    if (this.options.saveHistory && this.globalSettings.saveConversations !== false) {
      this.saveConversation();
    }
  }
  
  /**
   * Scrolls the chat to the bottom
   */
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  /**
   * Updates chat settings
   * 
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    this.chatSettings = {
      ...this.chatSettings,
      ...settings
    };
    
    // Save conversation with updated settings
    if (this.options.saveHistory && this.globalSettings.saveConversations !== false) {
      this.saveConversation();
    }
  }
  
  /**
   * Exports the chat as a file
   * 
   * @param {string} format - Export format ('json', 'markdown', or 'text')
   * @returns {Object} - Object with content, filename, and mimetype
   */
  exportChat(format = 'markdown') {
    let content = '';
    let filename = `${(this.chatSettings.title || 'conversation').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    let mimetype = '';
    
    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify({
          title: this.chatSettings.title,
          model: this.chatSettings.model,
          systemPrompt: this.chatSettings.systemPrompt,
          temperature: this.chatSettings.temperature,
          maxTokens: this.chatSettings.maxTokens,
          messages: this.conversation.filter(msg => msg.role !== 'system'),
          timestamp: Date.now()
        }, null, 2);
        filename += '.json';
        mimetype = 'application/json';
        break;
        
      case 'markdown':
        content = `# ${this.chatSettings.title || 'Conversation'}\n\n`;
        content += `Model: ${this.chatSettings.model}\n`;
        content += `Date: ${new Date().toLocaleString()}\n\n`;
        
        if (this.chatSettings.systemPrompt) {
          content += `System Prompt: ${this.chatSettings.systemPrompt}\n\n`;
        }
        
        content += '---\n\n';
        
        this.conversation.forEach(msg => {
          if (msg.role !== 'system') {
            content += `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n${msg.content}\n\n`;
          }
        });
        
        filename += '.md';
        mimetype = 'text/markdown';
        break;
        
      case 'text':
        this.conversation.forEach(msg => {
          if (msg.role !== 'system') {
            content += `${msg.role === 'user' ? 'You' : 'Assistant'}:\n${msg.content}\n\n`;
          }
        });
        
        filename += '.txt';
        mimetype = 'text/plain';
        break;
    }
    
    return { content, filename, mimetype };
  }
  
  /**
   * Gets the current conversation state
   * 
   * @returns {Object} - Conversation object
   */
  getConversation() {
    return {
      id: this.conversationId,
      title: this.chatSettings.title,
      model: this.chatSettings.model,
      systemPrompt: this.chatSettings.systemPrompt,
      temperature: this.chatSettings.temperature,
      maxTokens: this.chatSettings.maxTokens,
      messages: this.conversation,
      timestamp: Date.now()
    };
  }
  
  /**
   * Gets the current chat settings
   * 
   * @returns {Object} - Chat settings
   */
  getSettings() {
    return { ...this.chatSettings };
  }
  
  /**
   * Destroys the chat instance
   * Removes event listeners and cleans up
   */
  destroy() {
    // Remove event listeners
    this.sendButton.removeEventListener('click', this.sendMessage);
    this.input.removeEventListener('keydown', this.handleInputKeydown);
    
    // Clean up auto-resize if enabled
    if (this.input.tagName === 'TEXTAREA') {
      this.input.removeEventListener('input', this.handleInputResize);
    }
  }
}