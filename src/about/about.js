/**
 * Sololom - About Page Script
 * Handles tab switching and other functionality on the about page
 */

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const copyButtons = document.querySelectorAll('.copy-btn');
const versionElement = document.getElementById('version');
const toast = document.getElementById('toast');

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Load theme setting
  const { globalSettings } = await chrome.storage.sync.get('globalSettings');
  if (globalSettings && globalSettings.theme) {
    document.body.setAttribute('data-theme', globalSettings.theme);
  }
  
  // Check if page was loaded with hash
  const hash = window.location.hash.substring(1);
  if (hash && ['about', 'donate', 'support'].includes(hash)) {
    switchTab(hash);
  }
  
  // Get extension version from manifest
  try {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = manifest.version;
  } catch (error) {
    versionElement.textContent = '1.0.0';
  }
});

// Tab switching
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    switchTab(tab);
    
    // Update URL hash without triggering page reload
    window.history.replaceState(null, null, `#${tab}`);
  });
});

// Copy wallet address buttons
copyButtons.forEach(button => {
  button.addEventListener('click', () => {
    const elementId = button.dataset.clipboard;
    const element = document.getElementById(elementId);
    
    if (element) {
      // Copy text to clipboard
      navigator.clipboard.writeText(element.textContent.trim())
        .then(() => {
          // Show success toast
          showToast('Copied to clipboard!', 'success');
          
          // Change button text temporarily
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        })
        .catch(err => {
          showToast('Failed to copy. Please try again.', 'error');
        });
    }
  });
});

/**
 * Switches to the specified tab
 * @param {string} tabId - The ID of the tab to switch to
 */
function switchTab(tabId) {
  // Update tab buttons
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabId) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update tab contents
  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * Shows a toast message
 * @param {string} message - The message to show
 * @param {string} type - The type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = 'toast';
  toast.classList.add(type);
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
