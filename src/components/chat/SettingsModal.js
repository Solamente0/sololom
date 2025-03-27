/**
 * Settings Modal Component
 * 
 * Provides a modal dialog for configuring chat settings
 */

import * as SettingsService from '../../services/settings.js';
import { showToast } from '../../utils/helpers.js';

export default class SettingsModal {
  /**
   * Creates a new SettingsModal instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.modalId - ID of the modal element
   * @param {Function} options.onSave - Callback when settings are saved
   * @param {Function} options.onReset - Callback when settings are reset
   * @param {Function} options.onCancel - Callback when modal is closed
   * @param {Object} options.initialSettings - Initial settings
   */
  constructor(options) {
    this.options = options;
    
    this.modal = document.getElementById(options.modalId);
    if (!this.modal) {
      throw new Error(`Modal element with ID "${options.modalId}" not found`);
    }
    
    // Initial settings
    this.settings = options.initialSettings || {};
    
    // Cache DOM elements
    this.elements = {};
    
    // Bind methods
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleReset = this.handleReset.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initializes the modal
   */
  init() {
    // Find form elements
    this.cacheElements();
    
    // Add event listeners
    this.addEventListeners();
    
    // Populate form with initial settings
    this.populateForm();
  }
  
  /**
   * Caches DOM elements for faster access
   */
  cacheElements() {
    // Cache all input elements
    const inputs = this.modal.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      this.elements[input.id] = input;
    });
    
    // Cache buttons
    this.elements.closeBtn = this.modal.querySelector('.close-btn');
    this.elements.saveBtn = this.modal.querySelector('#saveChatSettingsBtn');
    this.elements.resetBtn = this.modal.querySelector('#resetChatSettingsBtn');
    
    // Cache temperature value display
    this.elements.temperatureValue = this.modal.querySelector('#temperatureValue');
  }
  
  /**
   * Adds event listeners
   */
  addEventListeners() {
    // Close button
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', this.hide);
    }
    
    // Save button
    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', this.handleSave);
    }
    
    // Reset button
    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', this.handleReset);
    }
    
    // Temperature slider
    if (this.elements.temperatureSlider && this.elements.temperatureValue) {
      this.elements.temperatureSlider.addEventListener('input', () => {
        this.elements.temperatureValue.textContent = this.elements.temperatureSlider.value;
      });
    }
    
    // Click outside to close
    window.addEventListener('click', this.handleClickOutside);
  }
  
  /**
   * Removes event listeners
   */
  removeEventListeners() {
    // Close button
    if (this.elements.closeBtn) {
      this.elements.closeBtn.removeEventListener('click', this.hide);
    }
    
    // Save button
    if (this.elements.saveBtn) {
      this.elements.saveBtn.removeEventListener('click', this.handleSave);
    }
    
    // Reset button
    if (this.elements.resetBtn) {
      this.elements.resetBtn.removeEventListener('click', this.handleReset);
    }
    
    // Temperature slider
    if (this.elements.temperatureSlider && this.elements.temperatureValue) {
      this.elements.temperatureSlider.removeEventListener('input', () => {});
    }
    
    // Click outside to close
    window.removeEventListener('click', this.handleClickOutside);
  }
  
  /**
   * Populates the form with current settings
   */
  populateForm() {
    // Set title input
    if (this.elements.chatTitleInput) {
      this.elements.chatTitleInput.value = this.settings.title || 'New Conversation';
    }
    
    // Set temperature slider
    if (this.elements.temperatureSlider) {
      this.elements.temperatureSlider.value = this.settings.temperature || 0.7;
    }
    
    // Set temperature value display
    if (this.elements.temperatureValue) {
      this.elements.temperatureValue.textContent = this.settings.temperature || 0.7;
    }
    
    // Set max tokens input
    if (this.elements.maxTokensInput) {
      this.elements.maxTokensInput.value = this.settings.maxTokens || 2048;
    }
    
    // Set system prompt textarea
    if (this.elements.systemPromptInput) {
      this.elements.systemPromptInput.value = this.settings.systemPrompt || 'You are a helpful assistant.';
    }
  }
  
  /**
   * Shows the modal
   */
  show() {
    this.modal.style.display = 'block';
  }
  
  /**
   * Hides the modal
   */
  hide() {
    this.modal.style.display = 'none';
    
    // Call onCancel callback if provided
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }
  
  /**
   * Handles click outside the modal
   * 
   * @param {Event} event - Click event
   */
  handleClickOutside(event) {
    if (event.target === this.modal) {
      this.hide();
    }
  }
  
  /**
   * Handles save button click
   */
  handleSave() {
    // Collect form values
    const newSettings = {};
    
    // Get title
    if (this.elements.chatTitleInput) {
      newSettings.title = this.elements.chatTitleInput.value.trim() || 'New Conversation';
    }
    
    // Get temperature
    if (this.elements.temperatureSlider) {
      newSettings.temperature = parseFloat(this.elements.temperatureSlider.value);
    }
    
    // Get max tokens
    if (this.elements.maxTokensInput) {
      newSettings.maxTokens = parseInt(this.elements.maxTokensInput.value);
    }
    
    // Get system prompt
    if (this.elements.systemPromptInput) {
      newSettings.systemPrompt = this.elements.systemPromptInput.value;
    }
    
    // Update settings
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    // Call onSave callback if provided
    if (this.options.onSave) {
      this.options.onSave(this.settings);
    }
    
    // Hide modal
    this.hide();
    
    // Show success toast
    showToast('Settings saved', 'success');
  }
  
  /**
   * Handles reset button click
   */
  async handleReset() {
    // Get default chat settings
    const defaultSettings = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful assistant.',
      title: this.settings.title || 'New Conversation'
    };
    
    // Update settings
    this.settings = defaultSettings;
    
    // Update form
    this.populateForm();
    
    // Call onReset callback if provided
    if (this.options.onReset) {
      this.options.onReset(defaultSettings);
    }
    
    // Show success toast
    showToast('Settings reset to defaults', 'success');
  }
  
  /**
   * Updates the settings
   * 
   * @param {Object} newSettings - New settings object
   */
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    // Update form
    this.populateForm();
  }
  
  /**
   * Gets the current settings
   * 
   * @returns {Object} - Current settings
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Destroys the modal instance
   * Removes event listeners and cleans up
   */
  destroy() {
    this.removeEventListeners();
  }
}
