/**
 * Sololom Helper Utilities
 * 
 * Collection of utility functions used throughout the extension
 */

/**
 * Generates a UUID v4
 * @returns {string} - A random UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Debounces a function to limit how often it can be called
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Formats a date to a readable string
 * 
 * @param {number|Date} date - The date to format (timestamp or Date object)
 * @param {Object} options - Options for formatting
 * @returns {string} - The formatted date string
 */
export function formatDate(date, options = {}) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions = {
    relative: false,
    format: 'short' // 'short', 'long', 'time'
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // For relative time (e.g. "2 hours ago")
  if (opts.relative) {
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  }
  
  // For formatted time
  switch (opts.format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'datetime':
      return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    default:
      return dateObj.toLocaleString();
  }
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 * 
 * @param {string} str - The string to truncate
 * @param {number} maxLength - The maximum length
 * @returns {string} - The truncated string
 */
export function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Converts a string to a slug for use in URLs or IDs
 * 
 * @param {string} str - The string to convert
 * @returns {string} - The slugified string
 */
export function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Gets a display name for the model
 * 
 * @param {string} model - Model ID
 * @returns {string} - Display name
 */
export function getModelDisplayName(model) {
  const modelMap = {
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'claude-2.1': 'Claude 2.1',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-sonnet': 'Claude 3 Sonnet',
    'mistral-small': 'Mistral Small',
    'mistral-medium': 'Mistral Medium',
    'mistral-large': 'Mistral Large'
  };
  
  return modelMap[model] || model;
}

/**
 * Gets the provider from the model name
 * 
 * @param {string} model - Model name
 * @returns {string} - Provider name (openai, anthropic, mistral)
 */
export function getProviderFromModel(model) {
  if (model.startsWith('gpt')) return 'openai';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('mistral')) return 'mistral';
  return 'unknown';
}

/**
 * Simply parses and renders markdown to HTML, handles basic markdown syntax
 * 
 * @param {string} markdown - The markdown string to convert to HTML
 * @returns {string} - HTML string
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Replace code blocks
  html = html.replace(/```(?:\w+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Replace inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Replace headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Replace bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Replace unordered lists
  html = html.replace(/^\s*\*\s(.*)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
  
  // Replace ordered lists
  html = html.replace(/^\s*\d+\.\s(.*)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, '<ol>$&</ol>');
  
  // Replace paragraphs (do this last to avoid breaking other patterns)
  html = html.replace(/^(?!<[a-z]).+/gm, '<p>$&</p>');
  
  return html;
}

/**
 * Downloads content as a file
 * 
 * @param {string} content - The content to download
 * @param {string} filename - The filename to use
 * @param {string} contentType - The MIME type of the content
 */
export function downloadAsFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
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
 * Shows a toast notification
 * 
 * @param {string} message - The message to show
 * @param {string} type - The type of toast (success, error, info)
 * @param {number} duration - How long to show the toast in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Look for an existing toast element
  let toast = document.getElementById('toast');
  
  // If no toast element exists, create one
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
    
    // Add basic styles if not already defined in CSS
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        #toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 4px;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          transform: translateY(100px);
          opacity: 0;
          transition: transform 0.3s, opacity 0.3s;
          z-index: 10000;
          color: white;
        }
        #toast.show {
          transform: translateY(0);
          opacity: 1;
        }
        #toast.info { background-color: #4a6ee0; }
        #toast.success { background-color: #4caf50; }
        #toast.error { background-color: #e53935; }
        #toast.warning { background-color: #ff9800; }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Set toast content and type
  toast.textContent = message;
  toast.className = 'toast';
  toast.classList.add(type);
  
  // Show the toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide the toast after the specified duration
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}