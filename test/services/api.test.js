/**
 * Tests for the API service
 */

import * as ApiService from '../../src/services/api';
import * as SettingsService from '../../src/services/settings';

// Mock the settings service
jest.mock('../../src/services/settings');

describe('API Service', () => {
  // Mock fetch before each test
  beforeEach(() => {
    global.fetch = jest.fn();
    
    // Default implementation for getGlobalSetting
    SettingsService.getGlobalSetting.mockImplementation((key, defaultValue) => {
      if (key === 'apiKeys.openai') return 'test-openai-key';
      if (key === 'apiKeys.anthropic') return 'test-anthropic-key';
      if (key === 'apiKeys.mistral') return 'test-mistral-key';
      return defaultValue;
    });
  });
  
  describe('getLLMResponse', () => {
    it('should call the appropriate API based on the model', async () => {
      // Mock successful responses for each provider
      const mockOpenAIResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'OpenAI response' } }] })
      };
      
      const mockAnthropicResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ content: [{ text: 'Anthropic response' }] })
      };
      
      const mockMistralResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'Mistral response' } }] })
      };
      
      // Set up fetch to return different responses based on the URL
      global.fetch.mockImplementation((url) => {
        if (url.includes('openai.com')) {
          return Promise.resolve(mockOpenAIResponse);
        } else if (url.includes('anthropic.com')) {
          return Promise.resolve(mockAnthropicResponse);
        } else if (url.includes('mistral.ai')) {
          return Promise.resolve(mockMistralResponse);
        }
        return Promise.reject(new Error('Unknown API'));
      });
      
      // Test OpenAI
      const openAIParams = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };
      
      const openAIResponse = await ApiService.getLLMResponse(openAIParams);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key'
          }),
          body: expect.any(String)
        })
      );
      
      expect(openAIResponse).toEqual({ choices: [{ message: { content: 'OpenAI response' } }] });
      
      // Reset fetch mock
      global.fetch.mockClear();
      
      // Test Anthropic
      const anthropicParams = {
        model: 'claude-3-opus',
        messages: [
          { role: 'system', content: 'You are Claude' },
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7
      };
      
      const anthropicResponse = await ApiService.getLLMResponse(anthropicParams);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': expect.any(String)
          }),
          body: expect.any(String)
        })
      );
      
      expect(anthropicResponse).toEqual({ content: [{ text: 'Anthropic response' }] });
      
      // Reset fetch mock
      global.fetch.mockClear();
      
      // Test Mistral
      const mistralParams = {
        model: 'mistral-medium',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };
      
      const mistralResponse = await ApiService.getLLMResponse(mistralParams);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-mistral-key'
          }),
          body: expect.any(String)
        })
      );
      
      expect(mistralResponse).toEqual({ choices: [{ message: { content: 'Mistral response' } }] });
    });
    
    it('should throw an error if API key is not configured', async () => {
      // Mock getGlobalSetting to return empty API key
      SettingsService.getGlobalSetting.mockImplementationOnce(() => '');
      
      const params = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      await expect(ApiService.getLLMResponse(params)).rejects.toThrow(
        'API key not configured for openai. Please check settings.'
      );
    });
    
    it('should throw an error for unsupported model provider', async () => {
      const params = {
        model: 'unknown-model',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      await expect(ApiService.getLLMResponse(params)).rejects.toThrow(
        'Unsupported model provider: unknown'
      );
    });
    
    it('should handle API errors', async () => {
      // Mock a failed API response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Invalid API key' }
        })
      });
      
      const params = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      await expect(ApiService.getLLMResponse(params)).rejects.toThrow(
        'OpenAI API Error: Invalid API key'
      );
    });
    
    it('should handle network errors', async () => {
      // Mock a network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const params = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      await expect(ApiService.getLLMResponse(params)).rejects.toThrow(
        'Failed to call OpenAI API: Network error'
      );
    });
  });
  
  describe('extractContentFromResponse', () => {
    it('should extract content from OpenAI response', () => {
      const response = {
        choices: [
          { message: { content: 'OpenAI response' } }
        ]
      };
      
      const content = ApiService.extractContentFromResponse(response, 'openai');
      expect(content).toBe('OpenAI response');
    });
    
    it('should extract content from Anthropic response', () => {
      const response = {
        content: [
          { text: 'Anthropic response' }
        ]
      };
      
      const content = ApiService.extractContentFromResponse(response, 'anthropic');
      expect(content).toBe('Anthropic response');
    });
    
    it('should extract content from Mistral response', () => {
      const response = {
        choices: [
          { message: { content: 'Mistral response' } }
        ]
      };
      
      const content = ApiService.extractContentFromResponse(response, 'mistral');
      expect(content).toBe('Mistral response');
    });
    
    it('should return empty string for null response', () => {
      const content = ApiService.extractContentFromResponse(null, 'openai');
      expect(content).toBe('');
    });
    
    it('should return empty string for unknown provider', () => {
      const response = { data: 'some data' };
      const content = ApiService.extractContentFromResponse(response, 'unknown');
      expect(content).toBe('');
    });
  });
  
  describe('getAvailableModels', () => {
    it('should return models for a specific provider', () => {
      const openaiModels = ApiService.getAvailableModels('openai');
      expect(openaiModels).toBeInstanceOf(Array);
      expect(openaiModels.length).toBeGreaterThan(0);
      expect(openaiModels[0]).toHaveProperty('id');
      expect(openaiModels[0]).toHaveProperty('name');
      
      const anthropicModels = ApiService.getAvailableModels('anthropic');
      expect(anthropicModels).toBeInstanceOf(Array);
      expect(anthropicModels.length).toBeGreaterThan(0);
      
      const mistralModels = ApiService.getAvailableModels('mistral');
      expect(mistralModels).toBeInstanceOf(Array);
      expect(mistralModels.length).toBeGreaterThan(0);
    });
    
    it('should return an empty array for unknown provider', () => {
      const models = ApiService.getAvailableModels('unknown');
      expect(models).toEqual([]);
    });
  });
  
  describe('getAllAvailableModels', () => {
    it('should return models for all providers with provider information', () => {
      const allModels = ApiService.getAllAvailableModels();
      
      expect(allModels).toBeInstanceOf(Array);
      expect(allModels.length).toBeGreaterThan(0);
      
      // Each model should have id, name, and provider properties
      allModels.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        
        // Provider should be one of the supported providers
        expect(['openai', 'anthropic', 'mistral']).toContain(model.provider);
      });
      
      // There should be at least one model from each provider
      const providers = allModels.map(model => model.provider);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('mistral');
    });
  });
  
  describe('testApiKey', () => {
    beforeEach(() => {
      // Reset fetch mock
      global.fetch.mockReset();
    });
    
    it('should validate OpenAI API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [{ id: 'model1' }] })
      });
      
      const result = await ApiService.testApiKey('openai', 'test-key');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
      
      expect(result).toEqual({
        success: true,
        message: 'API key is valid'
      });
    });
    
    it('should validate Anthropic API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });
      
      const result = await ApiService.testApiKey('anthropic', 'test-key');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': expect.any(String)
          }),
          body: expect.any(String)
        })
      );
      
      expect(result).toEqual({
        success: true,
        message: 'API key is valid'
      });
    });
    
    it('should validate Mistral API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });
      
      const result = await ApiService.testApiKey('mistral', 'test-key');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
      
      expect(result).toEqual({
        success: true,
        message: 'API key is valid'
      });
    });
    
    it('should return failure for invalid API key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Invalid API key' }
        })
      });
      
      const result = await ApiService.testApiKey('openai', 'invalid-key');
      
      expect(result).toEqual({
        success: false,
        message: 'Invalid API key: Invalid API key'
      });
    });
    
    it('should return failure for empty API key', async () => {
      const result = await ApiService.testApiKey('openai', '');
      
      expect(result).toEqual({
        success: false,
        message: 'API key is empty'
      });
    });
    
    it('should return failure for unsupported provider', async () => {
      const result = await ApiService.testApiKey('unknown', 'test-key');
      
      expect(result).toEqual({
        success: false,
        message: 'Unsupported provider: unknown'
      });
    });
    
    it('should handle fetch errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await ApiService.testApiKey('openai', 'test-key');
      
      expect(result).toEqual({
        success: false,
        message: 'Error testing API key: Network error'
      });
    });
  });
});
