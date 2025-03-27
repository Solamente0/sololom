/**
 * Sololom Messaging Utility
 * 
 * Provides utilities for communication between different parts of the extension
 */

/**
 * Sends a message to the background script and returns a promise with the response
 * 
 * @param {Object} message - The message to send to the background script
 * @returns {Promise<any>} - Promise that resolves with the response
 */
export async function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Sends a message to a specific tab
 * 
 * @param {number} tabId - The ID of the tab to send the message to
 * @param {Object} message - The message to send
 * @returns {Promise<any>} - Promise that resolves with the response
 */
export async function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Sends a message to all tabs
 * 
 * @param {Object} message - The message to send
 * @returns {Promise<Array>} - Promise that resolves with an array of responses
 */
export async function sendToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  return Promise.all(
    tabs.map(tab => sendToTab(tab.id, message).catch(() => null))
  );
}

/**
 * Sets up a listener for messages from other parts of the extension
 * 
 * @param {Object} handlers - Object mapping action types to handler functions
 * @returns {Function} - Function to remove the listener
 */
export function setupMessageListener(handlers) {
  const listener = (message, sender, sendResponse) => {
    const action = message.action;
    
    if (handlers[action]) {
      // Handle the action
      const result = handlers[action](message, sender);
      
      // If result is a promise, wait for it to resolve
      if (result instanceof Promise) {
        result.then(sendResponse).catch(error => {
          console.error(`Error handling message ${action}:`, error);
          sendResponse({ error: error.message });
        });
        return true; // Keep the message channel open for the async response
      }
      
      // Otherwise, send the response immediately
      sendResponse(result);
      return false;
    }
    
    return false;
  };
  
  chrome.runtime.onMessage.addListener(listener);
  
  // Return a function to remove the listener
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}
