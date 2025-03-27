/**
 * Conversation List Component
 *
 * Displays a list of saved conversations with options to manage them
 */

import * as StorageService from "../services/storage.js";
import {
  formatDate,
  truncateString,
  getModelDisplayName,
} from "../utils/helpers.js";

export default class ConversationList {
  /**
   * Creates a new ConversationList instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {Function} options.onSelect - Callback when a conversation is selected
   * @param {Function} options.onDelete - Callback when a conversation is deleted
   * @param {string} options.activeConversationId - ID of the active conversation
   * @param {boolean} options.enableSearch - Whether to show search box
   */
  constructor(options) {
    this.options = {
      enableSearch: true,
      ...options,
    };

    this.container = document.getElementById(options.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${options.containerId}" not found`);
    }

    // State
    this.conversations = [];
    this.activeConversationId = options.activeConversationId || null;
    this.searchQuery = "";

    // Bind methods
    this.handleSelect = this.handleSelect.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleSearch = this.handleSearch.bind(this);

    // Initialize
    this.init();
  }

  /**
   * Initializes the component
   */
  async init() {
    try {
      // Load conversations
      await this.loadConversations();

      // Render the list
      this.render();
    } catch (error) {
      console.error("Error initializing conversation list:", error);
    }
  }

  /**
   * Loads conversations from storage
   */
  async loadConversations() {
    try {
      this.conversations = await StorageService.getConversations();

      // Sort by timestamp descending (newest first)
      this.conversations.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error loading conversations:", error);
      this.conversations = [];
    }
  }

  /**
   * Renders the conversation list
   */
  render() {
    if (!this.container) return;

    // Clear container
    this.container.innerHTML = "";

    // Create search input if enabled
    if (this.options.enableSearch) {
      const searchContainer = document.createElement("div");
      searchContainer.className = "conversation-search";

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search conversations...";
      searchInput.value = this.searchQuery;
      searchInput.addEventListener("input", this.handleSearch);

      searchContainer.appendChild(searchInput);
      this.container.appendChild(searchContainer);
    }

    // Filter conversations if search query exists
    let filteredConversations = this.conversations;
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredConversations = this.conversations.filter((conv) => {
        // Search in title
        if (conv.title && conv.title.toLowerCase().includes(query)) {
          return true;
        }

        // Search in messages
        if (conv.messages && conv.messages.length > 0) {
          return conv.messages.some(
            (msg) => msg.content && msg.content.toLowerCase().includes(query)
          );
        }

        return false;
      });
    }

    // Create list
    const listElement = document.createElement("div");
    listElement.className = "conversations-list";

    if (filteredConversations.length === 0) {
      // Show empty state
      const emptyState = document.createElement("div");
      emptyState.className = "conversations-empty";
      emptyState.textContent = this.searchQuery
        ? "No conversations match your search"
        : "No saved conversations yet";

      listElement.appendChild(emptyState);
    } else {
      // Add conversations
      filteredConversations.forEach((conversation) => {
        const item = this.createConversationItem(conversation);
        listElement.appendChild(item);
      });
    }

    this.container.appendChild(listElement);
  }

  /**
   * Creates a conversation item element
   *
   * @param {Object} conversation - Conversation data
   * @returns {HTMLElement} - The conversation item element
   */
  createConversationItem(conversation) {
    const item = document.createElement("div");
    item.className = "conversation-item";
    item.dataset.id = conversation.id;

    if (conversation.id === this.activeConversationId) {
      item.classList.add("active");
    }

    // Get conversation title
    const title = conversation.title || "Untitled Conversation";

    // Get the first user message content for the snippet
    let snippet = "";
    if (conversation.messages && conversation.messages.length > 0) {
      const userMessage = conversation.messages.find((m) => m.role === "user");
      if (userMessage) {
        snippet = truncateString(userMessage.content, 60);
      }
    }

    // Get model name
    const modelName = getModelDisplayName(conversation.model);

    // Format date
    const dateStr = formatDate(conversation.timestamp, { relative: true });

    // Create item HTML
    item.innerHTML = `
      <div class="conversation-header">
        <div class="conversation-title">${title}</div>
        <div class="conversation-actions">
          <button class="delete-btn" title="Delete conversation">🗑️</button>
        </div>
      </div>
      ${snippet ? `<div class="conversation-snippet">${snippet}</div>` : ""}
      <div class="conversation-meta">
        <span class="conversation-model">${modelName}</span>
        <span class="conversation-date">${dateStr}</span>
      </div>
    `;

    // Add event listeners
    item.addEventListener("click", (e) => {
      // Ignore if delete button was clicked
      if (e.target.closest(".delete-btn")) return;

      this.handleSelect(conversation.id);
    });

    const deleteBtn = item.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleDelete(conversation.id);
      });
    }

    return item;
  }

  /**
   * Handles conversation selection
   *
   * @param {string} id - Conversation ID
   */
  handleSelect(id) {
    this.activeConversationId = id;

    // Update active class
    const items = this.container.querySelectorAll(".conversation-item");
    items.forEach((item) => {
      if (item.dataset.id === id) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Call onSelect callback if provided
    if (this.options.onSelect) {
      const conversation = this.conversations.find((c) => c.id === id);
      this.options.onSelect(conversation);
    }
  }

  /**
   * Handles conversation deletion
   *
   * @param {string} id - Conversation ID
   */
  async handleDelete(id) {
    if (confirm("Are you sure you want to delete this conversation?")) {
      try {
        // Delete from storage
        await StorageService.deleteConversation(id);

        // Remove from list
        this.conversations = this.conversations.filter((c) => c.id !== id);

        // Re-render the list
        this.render();

        // Call onDelete callback if provided
        if (this.options.onDelete) {
          this.options.onDelete(id);
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }
  }

  /**
   * Handles search input
   *
   * @param {Event} event - Input event
   */
  handleSearch(event) {
    this.searchQuery = event.target.value.trim();
    this.render();
  }

  /**
   * Refreshes the conversation list
   */
  async refresh() {
    await this.loadConversations();
    this.render();
  }

  /**
   * Sets the active conversation
   *
   * @param {string} id - Conversation ID
   */
  setActiveConversation(id) {
    this.activeConversationId = id;

    // Update UI
    const items = this.container.querySelectorAll(".conversation-item");
    items.forEach((item) => {
      if (item.dataset.id === id) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Gets all loaded conversations
   *
   * @returns {Array} - Array of conversations
   */
  getConversations() {
    return [...this.conversations];
  }

  /**
   * Gets a conversation by ID
   *
   * @param {string} id - Conversation ID
   * @returns {Object|null} - The conversation or null if not found
   */
  getConversationById(id) {
    return this.conversations.find((c) => c.id === id) || null;
  }

  /**
   * Updates a conversation in the list
   *
   * @param {Object} conversation - Updated conversation data
   */
  updateConversation(conversation) {
    const index = this.conversations.findIndex((c) => c.id === conversation.id);

    if (index !== -1) {
      this.conversations[index] = conversation;
      this.render();
    }
  }

  /**
   * Adds a new conversation to the list
   *
   * @param {Object} conversation - Conversation data
   */
  addConversation(conversation) {
    // Check if conversation already exists
    const index = this.conversations.findIndex((c) => c.id === conversation.id);

    if (index !== -1) {
      // Update existing conversation
      this.conversations[index] = conversation;
    } else {
      // Add new conversation
      this.conversations.unshift(conversation);
    }

    this.render();
  }
}
