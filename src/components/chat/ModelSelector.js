/**
 * Model Selector Component
 * 
 * Provides a dropdown for selecting LLM models
 */

import * as ApiService from '../../services/api.js';
import * as SettingsService from '../../services/settings.js';
import { getProviderFromModel } from '../../utils/helpers.js';

export default class ModelSelector {
  /**
   * Creates a new ModelSelector instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {Function} options.onChange - Callback when model is changed
   * @param {string} options.initialModel - Initial model selection
   * @param {boolean} options.showProviderIcons - Whether to show provider icons
   * @param {Array} options.groupByProvider - Whether to group models by provider
   */
  constructor(options) {
    this.options = {
      showProviderIcons: true,
      groupByProvider: true,
      ...options
    };
    
    this.container = document.getElementById(options.containerId);
    this.selectedModel = options.initialModel || 'gpt-3.5-turbo';
    
    // State
    this.models = [];
    this.providerApiKeys = {};
    
    // Bind methods
    this.handleChange = this.handleChange.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initializes the component
   */
  async init() {
    try {
      // Get global settings to check for API keys
      const globalSettings = await SettingsService.getGlobalSettings();
      this.providerApiKeys = globalSettings.apiKeys || {};
      
      // Get all available models
      this.models = ApiService.getAllAvailableModels();
      
      // Render the selector
      this.render();
    } catch (error) {
      console.error('Error initializing model selector:', error);
    }
  }
  
  /**
   * Renders the model selector
   */
  render() {
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create select element
    const select = document.createElement('select');
    select.className = 'model-select';
    select.addEventListener('change', this.handleChange);
    
    if (this.options.groupByProvider) {
      // Group models by provider
      const providers = {
        openai: { name: 'OpenAI', models: [] },
        anthropic: { name: 'Anthropic', models: [] },
        mistral: { name: 'Mistral', models: [] }
      };
      
      // Categorize models by provider
      this.models.forEach(model => {
        if (providers[model.provider]) {
          providers[model.provider].models.push(model);
        }
      });
      
      // Create option groups
      Object.entries(providers).forEach(([providerId, provider]) => {
        if (provider.models.length > 0) {
          const group = document.createElement('optgroup');
          group.label = provider.name;
          
          // Check if provider has API key
          const hasApiKey = this.providerApiKeys[providerId] && this.providerApiKeys[providerId].trim() !== '';
          
          provider.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.text = model.name;
            option.disabled = !hasApiKey;
            
            if (!hasApiKey) {
              option.text += ' (API key required)';
            }
            
            if (model.id === this.selectedModel) {
              option.selected = true;
            }
            
            group.appendChild(option);
          });
          
          select.appendChild(group);
        }
      });
    } else {
      // Flat list of models
      this.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.text = model.name;
        
        // Check if provider has API key
        const provider = getProviderFromModel(model.id);
        const hasApiKey = this.providerApiKeys[provider] && this.providerApiKeys[provider].trim() !== '';
        
        option.disabled = !hasApiKey;
        
        if (!hasApiKey) {
          option.text += ' (API key required)';
        }
        
        if (model.id === this.selectedModel) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
    }
    
    // Add to container
    this.container.appendChild(select);
    
    // Add icons if enabled
    if (this.options.showProviderIcons) {
      this.addProviderIconStyles();
    }
  }
  
  /**
   * Adds CSS for provider icons
   */
  addProviderIconStyles() {
    // Add styles if not already added
    if (!document.getElementById('model-selector-styles')) {
      const style = document.createElement('style');
      style.id = 'model-selector-styles';
      style.textContent = `
        .model-select option[value^="gpt"] {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="%2310a37f"/></svg>');
          background-repeat: no-repeat;
          background-position: 5px center;
          padding-left: 25px;
        }
        
        .model-select option[value^="claude"] {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="%23a100ff"/></svg>');
          background-repeat: no-repeat;
          background-position: 5px center;
          padding-left: 25px;
        }
        
        .model-select option[value^="mistral"] {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="%230056b3"/></svg>');
          background-repeat: no-repeat;
          background-position: 5px center;
          padding-left: 25px;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Handles model selection change
   * 
   * @param {Event} event - Change event
   */
  handleChange(event) {
    const newModel = event.target.value;
    this.selectedModel = newModel;
    
    // Call onChange callback if provided
    if (this.options.onChange) {
      this.options.onChange(newModel);
    }
  }
  
  /**
   * Gets the currently selected model
   * 
   * @returns {string} - Selected model ID
   */
  getSelectedModel() {
    return this.selectedModel;
  }
  
  /**
   * Sets the selected model
   * 
   * @param {string} modelId - Model ID to select
   */
  setSelectedModel(modelId) {
    this.selectedModel = modelId;
    
    // Update the select element
    const select = this.container.querySelector('select');
    if (select) {
      select.value = modelId;
    }
  }
  
  /**
   * Updates the available models
   * 
   * @param {Array} models - New models array
   */
  updateModels(models) {
    this.models = models;
    this.render();
  }
  
  /**
   * Updates the API keys
   * 
   * @param {Object} apiKeys - New API keys object
   */
  updateApiKeys(apiKeys) {
    this.providerApiKeys = apiKeys;
    this.render();
  }
  
  /**
   * Enables the selector
   */
  enable() {
    const select = this.container.querySelector('select');
    if (select) {
      select.disabled = false;
    }
  }
  
  /**
   * Disables the selector
   */
  disable() {
    const select = this.container.querySelector('select');
    if (select) {
      select.disabled = true;
    }
  }
}
