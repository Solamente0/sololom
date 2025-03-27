/**
 * Tests for the ModelSelector component
 */

import ModelSelector from '../../../src/components/ui/ModelSelector';
import * as ApiService from '../../../src/services/api';
import * as SettingsService from '../../../src/services/settings';

// Mock the services
jest.mock('../../../src/services/api');
jest.mock('../../../src/services/settings');

describe('ModelSelector Component', () => {
  // Container element
  let container;
  
  // Mock callback
  const mockOnChange = jest.fn();
  
  // Default options
  const defaultOptions = {
    containerId: 'model-selector',
    onChange: mockOnChange,
    initialModel: 'gpt-3.5-turbo',
    showProviderIcons: true,
    groupByProvider: true
  };
  
  // Sample models
  const sampleModels = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
    { id: 'mistral-medium', name: 'Mistral Medium', provider: 'mistral' }
  ];
  
  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = '';
    
    // Create container element
    container = document.createElement('div');
    container.id = 'model-selector';
    document.body.appendChild(container);
    
    // Mock API and Settings services
    ApiService.getAllAvailableModels.mockReturnValue(sampleModels);
    
    SettingsService.getGlobalSettings.mockResolvedValue({
      apiKeys: {
        openai: 'test-key',
        anthropic: 'test-key',
        mistral: ''
      }
    });
    
    // Reset mocks
    jest.clearAllMocks();
    mockOnChange.mockClear();
  });
  
  describe('Initialization', () => {
    it('should render a select element with models grouped by provider', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that API service was called
      expect(ApiService.getAllAvailableModels).toHaveBeenCalled();
      
      // Check that select element was created
      const select = container.querySelector('select');
      expect(select).not.toBeNull();
      
      // Check that models are grouped by provider (should have optgroup elements)
      const optgroups = container.querySelectorAll('optgroup');
      expect(optgroups.length).toBeGreaterThan(0);
      
      // Should have options for each model
      const options = container.querySelectorAll('option');
      expect(options.length).toBe(sampleModels.length);
      
      // Initial model should be selected
      const selectedOption = container.querySelector('option[selected]');
      expect(selectedOption).not.toBeNull();
      expect(selectedOption.value).toBe('gpt-3.5-turbo');
    });
    
    it('should render models as a flat list when groupByProvider is false', async () => {
      // Create model selector with groupByProvider: false
      const options = {
        ...defaultOptions,
        groupByProvider: false
      };
      
      const modelSelector = new ModelSelector(options);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that models are not grouped (no optgroup elements)
      const optgroups = container.querySelectorAll('optgroup');
      expect(optgroups.length).toBe(0);
      
      // Should have options for each model
      const options = container.querySelectorAll('option');
      expect(options.length).toBe(sampleModels.length);
    });
    
    it('should disable models without API keys', async () => {
      // Set up API keys scenario (Mistral has no key)
      SettingsService.getGlobalSettings.mockResolvedValueOnce({
        apiKeys: {
          openai: 'test-key',
          anthropic: 'test-key',
          mistral: ''
        }
      });
      
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find Mistral option
      const mistralOption = Array.from(container.querySelectorAll('option'))
        .find(option => option.value === 'mistral-medium');
      
      // Check that it's disabled
      expect(mistralOption.disabled).toBe(true);
      expect(mistralOption.textContent).toContain('API key required');
    });
  });
  
  describe('Event Handling', () => {
    it('should call onChange callback when model is changed', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find select element
      const select = container.querySelector('select');
      
      // Change selection to another model
      select.value = 'gpt-4';
      
      // Trigger change event
      const event = new Event('change');
      select.dispatchEvent(event);
      
      // Check that onChange callback was called with the new model
      expect(mockOnChange).toHaveBeenCalledWith('gpt-4');
      
      // Check that selectedModel property was updated
      expect(modelSelector.getSelectedModel()).toBe('gpt-4');
    });
  });
  
  describe('API', () => {
    it('should get and set the selected model', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check initial selection
      expect(modelSelector.getSelectedModel()).toBe('gpt-3.5-turbo');
      
      // Change selection
      modelSelector.setSelectedModel('claude-3-opus');
      
      // Check updated selection
      expect(modelSelector.getSelectedModel()).toBe('claude-3-opus');
      
      // Check that select element was updated
      const select = container.querySelector('select');
      expect(select.value).toBe('claude-3-opus');
    });
    
    it('should update models list when updateModels is called', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // New set of models
      const newModels = [
        { id: 'model-a', name: 'Model A', provider: 'openai' },
        { id: 'model-b', name: 'Model B', provider: 'openai' }
      ];
      
      // Spy on render method
      const renderSpy = jest.spyOn(modelSelector, 'render');
      
      // Update models
      modelSelector.updateModels(newModels);
      
      // Check that render was called
      expect(renderSpy).toHaveBeenCalled();
      
      // Check that models were updated
      expect(modelSelector.models).toEqual(newModels);
      
      // Should have options for new models
      const options = container.querySelectorAll('option');
      expect(options.length).toBe(newModels.length);
      
      // Clean up spy
      renderSpy.mockRestore();
    });
    
    it('should update API keys when updateApiKeys is called', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // New API keys
      const newApiKeys = {
        openai: 'new-key',
        anthropic: '',
        mistral: 'new-key'
      };
      
      // Spy on render method
      const renderSpy = jest.spyOn(modelSelector, 'render');
      
      // Update API keys
      modelSelector.updateApiKeys(newApiKeys);
      
      // Check that render was called
      expect(renderSpy).toHaveBeenCalled();
      
      // Check that API keys were updated
      expect(modelSelector.providerApiKeys).toEqual(newApiKeys);
      
      // Clean up spy
      renderSpy.mockRestore();
    });
    
    it('should enable and disable the selector', async () => {
      // Create model selector
      const modelSelector = new ModelSelector(defaultOptions);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find select element
      const select = container.querySelector('select');
      
      // Check initial state (enabled)
      expect(select.disabled).toBe(false);
      
      // Disable selector
      modelSelector.disable();
      expect(select.disabled).toBe(true);
      
      // Enable selector
      modelSelector.enable();
      expect(select.disabled).toBe(false);
    });
  });
});
