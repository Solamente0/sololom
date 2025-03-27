/**
 * Theme Selector Component
 *
 * Provides controls for switching between light and dark themes
 */

import * as SettingsService from "../services/settings.js";

export default class ThemeSelector {
  /**
   * Creates a new ThemeSelector instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {string} options.initialTheme - Initial theme ('light' or 'dark')
   * @param {Function} options.onChange - Callback when theme is changed
   * @param {string} options.type - Type of selector ('toggle', 'buttons', or 'dropdown')
   */
  constructor(options) {
    this.options = {
      initialTheme: "light",
      type: "toggle",
      ...options,
    };

    this.container = document.getElementById(options.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${options.containerId}" not found`);
    }

    // State
    this.theme = options.initialTheme || "light";

    // Bind methods
    this.handleChange = this.handleChange.bind(this);

    // Initialize
    this.render();
  }

  /**
   * Renders the theme selector based on the specified type
   */
  render() {
    // Clear container
    this.container.innerHTML = "";

    switch (this.options.type) {
      case "toggle":
        this.renderToggle();
        break;
      case "buttons":
        this.renderButtons();
        break;
      case "dropdown":
        this.renderDropdown();
        break;
      default:
        this.renderToggle();
    }
  }

  /**
   * Renders a toggle switch for theme selection
   */
  renderToggle() {
    const toggleContainer = document.createElement("div");
    toggleContainer.className = "theme-toggle";

    const label = document.createElement("label");
    label.htmlFor = "themeToggle";
    label.textContent = "Dark Theme";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "themeToggle";
    toggle.checked = this.theme === "dark";
    toggle.addEventListener("change", () => {
      this.handleChange(toggle.checked ? "dark" : "light");
    });

    toggleContainer.appendChild(label);
    toggleContainer.appendChild(toggle);

    this.container.appendChild(toggleContainer);
  }

  /**
   * Renders buttons for theme selection
   */
  renderButtons() {
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "theme-buttons";

    const lightButton = document.createElement("button");
    lightButton.className = `theme-button ${
      this.theme === "light" ? "active" : ""
    }`;
    lightButton.innerHTML = "☀️ Light";
    lightButton.addEventListener("click", () => {
      this.handleChange("light");
    });

    const darkButton = document.createElement("button");
    darkButton.className = `theme-button ${
      this.theme === "dark" ? "active" : ""
    }`;
    darkButton.innerHTML = "🌙 Dark";
    darkButton.addEventListener("click", () => {
      this.handleChange("dark");
    });

    buttonsContainer.appendChild(lightButton);
    buttonsContainer.appendChild(darkButton);

    this.container.appendChild(buttonsContainer);
  }

  /**
   * Renders a dropdown for theme selection
   */
  renderDropdown() {
    const selectContainer = document.createElement("div");
    selectContainer.className = "theme-select-container";

    const label = document.createElement("label");
    label.htmlFor = "themeSelect";
    label.textContent = "Theme";

    const select = document.createElement("select");
    select.id = "themeSelect";
    select.className = "theme-select";

    const lightOption = document.createElement("option");
    lightOption.value = "light";
    lightOption.textContent = "Light";
    lightOption.selected = this.theme === "light";

    const darkOption = document.createElement("option");
    darkOption.value = "dark";
    darkOption.textContent = "Dark";
    darkOption.selected = this.theme === "dark";

    select.appendChild(lightOption);
    select.appendChild(darkOption);

    select.addEventListener("change", () => {
      this.handleChange(select.value);
    });

    selectContainer.appendChild(label);
    selectContainer.appendChild(select);

    this.container.appendChild(selectContainer);
  }

  /**
   * Handles theme change
   *
   * @param {string} theme - New theme ('light' or 'dark')
   */
  async handleChange(theme) {
    this.theme = theme;

    // Apply theme to the document
    SettingsService.applyTheme(theme);

    // Update UI
    this.updateUI();

    // Save to settings
    try {
      await SettingsService.setGlobalSetting("theme", theme);
    } catch (error) {
      console.error("Error saving theme setting:", error);
    }

    // Call onChange callback if provided
    if (this.options.onChange) {
      this.options.onChange(theme);
    }
  }

  /**
   * Updates the UI to reflect the current theme
   */
  updateUI() {
    switch (this.options.type) {
      case "toggle":
        const toggle = this.container.querySelector("#themeToggle");
        if (toggle) {
          toggle.checked = this.theme === "dark";
        }
        break;
      case "buttons":
        const buttons = this.container.querySelectorAll(".theme-button");
        buttons.forEach((button) => {
          if (
            (button.textContent.includes("Light") && this.theme === "light") ||
            (button.textContent.includes("Dark") && this.theme === "dark")
          ) {
            button.classList.add("active");
          } else {
            button.classList.remove("active");
          }
        });
        break;
      case "dropdown":
        const select = this.container.querySelector("#themeSelect");
        if (select) {
          select.value = this.theme;
        }
        break;
    }
  }

  /**
   * Sets the current theme
   *
   * @param {string} theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      throw new Error('Invalid theme. Must be "light" or "dark".');
    }

    this.theme = theme;

    // Apply theme to the document
    SettingsService.applyTheme(theme);

    // Update UI
    this.updateUI();
  }

  /**
   * Gets the current theme
   *
   * @returns {string} - Current theme ('light' or 'dark')
   */
  getTheme() {
    return this.theme;
  }

  /**
   * Toggles between light and dark theme
   */
  toggleTheme() {
    const newTheme = this.theme === "light" ? "dark" : "light";
    this.handleChange(newTheme);
  }
}
