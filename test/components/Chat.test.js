/**
 * Tests for the Chat component
 */

import Chat from '../../../src/components/chat/Chat';
import * as ApiService from '../../../src/services/api';
import * as StorageService from '../../../src/services/storage';
import * as SettingsService from '../../../src/services/settings';

// Mock the services
jest.mock('../../../src/services/api');
jest.mock('../../../src/services/storage');
jest.mock('../../../src/services/settings');

describe('Chat Component', () => {
  // DOM elements
  let container;
  let inputElement;
  let sendButton;
  let messagesContainer;
  
  // Mock callbacks
  const mockOnSendMessage = jest.fn();
  const mockOnReceiveMessage = jest.fn();
  const mockOnError = jest.fn();
  
  // Default options for Chat component
  const defaultOptions = {
    containerSelector: '#chat-container',
    inputSelector: '#chat-input',
    sendButtonSelector: '#send-button',
    messagesSelector: '#chat-messages',
    onSendMessage: mockOnSendMessage,
    onReceiveMessage: mockOnReceiveMessage,
    onError: mockOnError,
    saveHistory: true
  };
  
  // Default settings
  const defaultGlobalSettings = {
    theme: 'light',
    contextWindow: 0,
    saveConversations: true
  };
  
  const defaultChatSettings = {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful assistant.',
    title: 'New Conversation'
  };
  
  beforeEach(() => {
    // Create test DOM elements
    container = document.createElement('div');
    container.id = 'chat-container';
    document.body.appendChild(container);
    
    inputElement = document.createElement('input');
    inputElement.id = 'chat-input';
    container.appendChild(inputElement);
    
    sendButton = document.createElement('button');
    sendButton.id = 'send-button';
    container.appendChild(sendButton);
    
    messagesContainer = document.createElement('div');
    messagesContainer.id = 'chat-messages';
    container.appendChild(messagesContainer);
    
    // Default mock implementations
    SettingsService.getGlobalSettings.mockResolvedValue(defaultGlobalSettings);
    SettingsService.getChatSettings.mockResolvedValue(defaultChatSettings);
    
    StorageService.getConversationById.mockResolvedValue(null);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Element.scrollTop setter
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: function() { return 0; },
      set: function() {}
    });
  });
  
  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });
  
  describe('Initialization', () => {
    it('should initialize with default settings and empty conversation', async () => {
      const chat = new Chat(defaultOptions);
      
      // Wait for init to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(SettingsService.getGlobalSettings).toHaveBeenCalled();
      expect(SettingsService.getChatSettings).toHaveBeenCalled();
      
      // Should show empty state
      expect(messagesContainer.innerHTML).toContain('empty-state');
      
      // Should have correct initial state
      expect(chat.conversation).toEqual([]);
      expect(chat.isProcessing).toBe(false);
      expect(chat.chatSettings).toEqual(defaultChatSettings);
    });
    
    it('should load existing conversation if conversationId is provided', async () => {
      const existingConversation = {
        id: 'test-conversation',
        title: 'Test Conversation',
        model: 'gpt-4',
        systemPrompt: 'Custom prompt',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      };
      
      StorageService.getConversationById.mockResolvedValueOnce(existingConversation);
      
      const options = {
        ...defaultOptions,
        conversationId: 'test-conversation'
      };
      
      const chat = new Chat(options);
      
      // Wait for init to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(StorageService.getConversationById).toHaveBeenCalledWith('test-conversation');
      
      // Should have loaded conversation
      expect(chat.conversation).toEqual(existingConversation.messages);
      expect(chat.chatSettings.model).toBe('gpt-4');
      expect(chat.chatSettings.systemPrompt).toBe('Custom prompt');
      
      // Should have rendered messages
      expect(messagesContainer.innerHTML).toContain('Hello');
      expect(messagesContainer.innerHTML).toContain('Hi there!');
    });
  });
  
  describe('Sending Messages', () => {
    let chat;
    
    beforeEach(async () => {
      // Create chat instance and wait for initialization
      chat = new Chat(defaultOptions);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Mock ApiService.getLLMResponse to return a successful response
      ApiService.getLLMResponse.mockResolvedValue({
        choices: [{ message: { content: 'Test response' } }]
      });
      
      // Mock ApiService.extractContentFromResponse
      ApiService.extractContentFromResponse.mockReturnValue('Test response');
    });
    
    it('should send a message and receive a response', async () => {
      // Set input value and send
      inputElement.value = 'Hello';
      await chat.sendMessage();
      
      // Check that ApiService was called correctly
      expect(ApiService.getLLMResponse).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7,
        maxTokens: 2048
      });
      
      // Check that messages are added to conversation
      expect(chat.conversation).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Test response' }
      ]);
      
      // Check that messages are displayed in UI
      expect(messagesContainer.innerHTML).toContain('Hello');
      expect(messagesContainer.innerHTML).toContain('Test response');
      
      // Check that callbacks were called
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello');
      expect(mockOnReceiveMessage).toHaveBeenCalledWith('Test response', expect.any(Object));
      
      // Check that conversation was saved
      expect(StorageService.saveConversation).toHaveBeenCalled();
    });
    
    it('should handle API errors gracefully', async () => {
      // Make API service throw an error
      ApiService.getLLMResponse.mockRejectedValueOnce(new Error('API error'));
      
      // Set input value and send
      inputElement.value = 'Hello';
      await chat.sendMessage();
      
      // Check that error is displayed and callback is called
      expect(messagesContainer.innerHTML).toContain('Error: API error');
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      
      // Check that user message is still in conversation
      expect(chat.conversation).toEqual([
        { role: 'user', content: 'Hello' }
      ]);
    });
    
    it('should respect context window limit when sending messages', async () => {
      // Set up a conversation with multiple messages
      chat.conversation = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Response 3' }
      ];
      
      // Set context window limit to 2 messages (1 user + 1 assistant)
      chat.globalSettings.contextWindow = 2;
      
      // Set input value and send
      inputElement.value = 'Hello';
      await chat.sendMessage();
      
      // Check that only the most recent messages were sent to API
      expect(ApiService.getLLMResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Message 3' },
            { role: 'assistant', content: 'Response 3' },
            { role: 'user', content: 'Hello' }
          ]
        })
      );
    });
  });
  
  describe('UI Interactions', () => {
    let chat;
    
    beforeEach(async () => {
      // Create chat instance and wait for initialization
      chat = new Chat(defaultOptions);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    it('should clear chat and show empty state', async () => {
      // Set up some messages
      chat.conversation = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      chat.renderConversation();
      
      // Check that messages are displayed
      expect(messagesContainer.innerHTML).toContain('Hello');
      
      // Clear chat
      chat.clearChat();
      
      // Check that conversation is cleared
      expect(chat.conversation).toEqual([]);
      
      // Check that empty state is shown
      expect(messagesContainer.innerHTML).toContain('empty-state');
    });
    
    it('should keep system message when clearing chat', async () => {
      // Set up conversation with system message
      chat.conversation = [
        { role: 'system', content: 'Custom system prompt' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      // Clear chat
      chat.clearChat();
      
      // Check that only system message is kept
      expect(chat.conversation).toEqual([
        { role: 'system', content: 'Custom system prompt' }
      ]);
    });
  });
  
  describe('Settings Management', () => {
    let chat;
    
    beforeEach(async () => {
      // Create chat instance and wait for initialization
      chat = new Chat(defaultOptions);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    it('should update chat settings', async () => {
      const newSettings = {
        model: 'gpt-4',
        temperature: 0.9,
        systemPrompt: 'Updated prompt'
      };
      
      chat.updateSettings(newSettings);
      
      // Check that settings were updated
      expect(chat.chatSettings).toEqual({
        ...defaultChatSettings,
        ...newSettings
      });
      
      // Check that conversation was saved with updated settings
      expect(StorageService.saveConversation).toHaveBeenCalled();
    });
  });
  
  describe('Export Functionality', () => {
    let chat;
    
    beforeEach(async () => {
      // Create chat instance and wait for initialization
      chat = new Chat(defaultOptions);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Set up a conversation with a system prompt
      chat.conversation = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      chat.chatSettings.title = 'Test Conversation';
    });
    
    it('should export conversation as JSON', () => {
      const exported = chat.exportChat('json');
      
      expect(exported.mimetype).toBe('application/json');
      expect(exported.filename).toMatch(/test_conversation.*\.json$/);
      
      // Parse the content to check it
      const content = JSON.parse(exported.content);
      expect(content.title).toBe('Test Conversation');
      expect(content.model).toBe('gpt-3.5-turbo');
      expect(content.messages).toHaveLength(2); // System message is filtered out
      expect(content.messages[0].role).toBe('user');
      expect(content.messages[1].role).toBe('assistant');
    });
    
    it('should export conversation as Markdown', () => {
      const exported = chat.exportChat('markdown');
      
      expect(exported.mimetype).toBe('text/markdown');
      expect(exported.filename).toMatch(/test_conversation.*\.md$/);
      
      // Check markdown content
      expect(exported.content).toContain('# Test Conversation');
      expect(exported.content).toContain('Model: gpt-3.5-turbo');
      expect(exported.content).toContain('System Prompt: You are a helpful assistant.');
      expect(exported.content).toContain('## You\n\nHello');
      expect(exported.content).toContain('## Assistant\n\nHi there!');
    });
    
    it('should export conversation as plain text', () => {
      const exported = chat.exportChat('text');
      
      expect(exported.mimetype).toBe('text/plain');
      expect(exported.filename).toMatch(/test_conversation.*\.txt$/);
      
      // Check text content
      expect(exported.content).toContain('You:\nHello');
      expect(exported.content).toContain('Assistant:\nHi there!');
    });
  });
  
  describe('Cleanup', () => {
    it('should remove event listeners when destroyed', async () => {
      const chat = new Chat(defaultOptions);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Spy on removeEventListener
      const sendBtnSpy = jest.spyOn(sendButton, 'removeEventListener');
      const inputSpy = jest.spyOn(inputElement, 'removeEventListener');
      
      // Destroy the chat instance
      chat.destroy();
      
      // Check that event listeners were removed
      expect(sendBtnSpy).toHaveBeenCalled();
      expect(inputSpy).toHaveBeenCalled();
    });
  });
});
