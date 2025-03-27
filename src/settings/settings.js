/**
 * Sololom - Settings Script
 * Handles global extension settings
 */

// DOM Elements
const themeToggle = document.getElementById("themeToggle");
const openaiApiKey = document.getElementById("openaiApiKey");
const anthropicApiKey = document.getElementById("anthropicApiKey");
const mistralApiKey = document.getElementById("mistralApiKey");
const openrouterApiKey = document.getElementById("openrouterApiKey");
const defaultModel = document.getElementById("defaultModel");
const saveConversations = document.getElementById("saveConversations");
const maxConversations = document.getElementById("maxConversations");
const fontSize = document.getElementById("fontSize");
const compactMode = document.getElementById("compactMode");
const contextWindow = document.getElementById("contextWindow");
const exportSettingsBtn = document.getElementById("exportSettingsBtn");
const importSettingsBtn = document.getElementById("importSettingsBtn");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const aboutLink = document.getElementById("aboutLink");
const donateLink = document.getElementById("donateLink");
const supportLink = document.getElementById("supportLink");
const toggleVisibilityBtns = document.querySelectorAll(".toggle-visibility");

// State
let globalSettings = {};
let originalSettings = {};

// Initialize settings page
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();

  // Apply theme
  document.body.setAttribute("data-theme", globalSettings.theme || "light");
  themeToggle.checked = globalSettings.theme === "dark";

  // Fill form with settings
  populateForm();

  // Store original settings for cancel functionality
  originalSettings = JSON.parse(JSON.stringify(globalSettings));
});

// Event Listeners
themeToggle.addEventListener("change", () => {
  const theme = themeToggle.checked ? "dark" : "light";
  document.body.setAttribute("data-theme", theme);
  globalSettings.theme = theme;
});

// Toggle password visibility
toggleVisibilityBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const inputId = btn.getAttribute("data-for");
    const input = document.getElementById(inputId);
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "🔒";
    } else {
      input.type = "password";
      btn.textContent = "👁️";
    }
  });
});

// Save settings
saveBtn.addEventListener("click", async () => {
  // Collect settings from form
  globalSettings.apiKeys = {
    openai: openaiApiKey.value.trim(),
    anthropic: anthropicApiKey.value.trim(),
    mistral: mistralApiKey.value.trim(),
    openrouter: openrouterApiKey.value.trim(),
  };

  globalSettings.defaultModel = defaultModel.value;
  globalSettings.saveConversations = saveConversations.checked;
  globalSettings.maxConversations = parseInt(maxConversations.value);
  globalSettings.fontSize = fontSize.value;
  globalSettings.compactMode = compactMode.checked;
  globalSettings.contextWindow = parseInt(contextWindow.value);

  // Save to storage
  await chrome.storage.sync.set({ globalSettings });

  // Show success toast
  showToast("Settings saved successfully", "success");

  // Update original settings
  originalSettings = JSON.parse(JSON.stringify(globalSettings));
});

// Cancel changes
cancelBtn.addEventListener("click", () => {
  // Restore original settings
  globalSettings = JSON.parse(JSON.stringify(originalSettings));
  populateForm();

  // Show toast
  showToast("Changes canceled", "info");
});

// Reset settings
resetSettingsBtn.addEventListener("click", async () => {
  if (
    confirm("Are you sure you want to reset all settings to default values?")
  ) {
    // Set default global settings
    globalSettings = {
      theme: "light",
      defaultModel: "gpt-3.5-turbo",
      apiKeys: {
        openai: "",
        anthropic: "",
        mistral: "",
        openrouter: "", // Add this line
      },
      saveConversations: true,
      maxConversations: 100,
      fontSize: "medium",
      compactMode: false,
      contextWindow: 0,
    };

    // Update form
    populateForm();

    // Apply theme
    document.body.setAttribute("data-theme", globalSettings.theme);

    // Save to storage
    await chrome.storage.sync.set({ globalSettings });

    // Show toast
    showToast("Settings reset to defaults", "success");

    // Update original settings
    originalSettings = JSON.parse(JSON.stringify(globalSettings));
  }
});

// Export settings
exportSettingsBtn.addEventListener("click", () => {
  // Create a JSON file with settings (excluding API keys for security)
  const exportSettings = JSON.parse(JSON.stringify(globalSettings));
  exportSettings.apiKeys = {
    openai: exportSettings.apiKeys.openai ? "[API_KEY]" : "",
    anthropic: exportSettings.apiKeys.anthropic ? "[API_KEY]" : "",
    mistral: exportSettings.apiKeys.mistral ? "[API_KEY]" : "",
    openrouter: exportSettings.apiKeys.openrouter ? "[API_KEY]" : "",
  };

  const dataStr = JSON.stringify(exportSettings, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = "sololom-settings.json";

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
});

// Import settings
importSettingsBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (readerEvent) => {
      try {
        const content = readerEvent.target.result;
        const importedSettings = JSON.parse(content);

        // Validate imported settings
        if (!importedSettings || typeof importedSettings !== "object") {
          throw new Error("Invalid settings file");
        }

        // Keep current API keys for security
        importedSettings.apiKeys = {
          openai: openaiApiKey.value,
          anthropic: anthropicApiKey.value,
          mistral: mistralApiKey.value,
        };

        // Update settings
        globalSettings = { ...globalSettings, ...importedSettings };

        // Update form
        populateForm();

        // Apply theme
        document.body.setAttribute("data-theme", globalSettings.theme);

        // Show toast
        showToast("Settings imported successfully", "success");
      } catch (error) {
        showToast("Error importing settings: " + error.message, "error");
      }
    };

    reader.readAsText(file);
  };

  input.click();
});

// Navigation links
aboutLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("src/about/about.html") });
});

donateLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({
    url: chrome.runtime.getURL("src/about/about.html#donate"),
  });
});

/**
 * Loads settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.sync.get("globalSettings");

  if (result.globalSettings) {
    globalSettings = result.globalSettings;
  } else {
    globalSettings = {
      theme: "light",
      defaultModel: "gpt-3.5-turbo",
      apiKeys: {
        openai: "",
        anthropic: "",
        mistral: "",
      },
      saveConversations: true,
      maxConversations: 100,
      fontSize: "medium",
      compactMode: false,
      contextWindow: 0,
    };
  }
}

/**
 * Populates the form with current settings
 */
function populateForm() {
  // API keys
  openaiApiKey.value = globalSettings.apiKeys?.openai || "";
  anthropicApiKey.value = globalSettings.apiKeys?.anthropic || "";
  mistralApiKey.value = globalSettings.apiKeys?.mistral || "";
  openrouterApiKey.value = globalSettings.apiKeys?.openrouter || "";

  // General settings
  defaultModel.value = globalSettings.defaultModel || "gpt-3.5-turbo";
  saveConversations.checked = globalSettings.saveConversations !== false;
  maxConversations.value = globalSettings.maxConversations || 100;

  // Appearance settings
  themeToggle.checked = globalSettings.theme === "dark";
  fontSize.value = globalSettings.fontSize || "medium";
  compactMode.checked = globalSettings.compactMode === true;

  // Advanced settings
  contextWindow.value = globalSettings.contextWindow || 0;
}

/**
 * Shows a toast message
 * @param {string} message - The message to show
 * @param {string} type - The type of toast (success, error, info)
 */
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(type);
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
