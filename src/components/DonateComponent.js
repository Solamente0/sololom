/*
*
 * Donate Component
 *
 * Displays donation options with wallet addresses and copy functionality

*/

import { showToast } from "../utils/helpers.js";

export default class DonateComponent {
  /**
   * Creates a new DonateComponent instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {Object} options.wallets - Wallet addresses
   * @param {string} options.wallets.btc - Bitcoin address
   * @param {string} options.wallets.eth - Ethereum address
   * @param {Function} options.onCopy - Callback when address is copied
   */
  constructor(options) {
    this.options = {
      wallets: {
        btc: "bc1qfw0cmg30lgard7jx66mh85l0ea7kvt38tppe57",
        eth: "0x1410F99B230E87833A7A9E3b4c6ed5C5Cd57A5D8",
        trx: "TPyyZZNrc9naqKzPYEzdmzouAHoXh7M1EA",
      },
      ...options,
    };

    this.container = document.getElementById(options.containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${options.containerId}" not found`);
    }

    // Bind methods
    this.handleCopy = this.handleCopy.bind(this);

    // Initialize
    this.render();
  }

  /**
   * Renders the donate component
   */
  render() {
    // Clear container
    this.container.innerHTML = "";

    // Create donate section
    const donateSection = document.createElement("div");
    donateSection.className = "donate-section";

    // Create header
    const header = document.createElement("div");
    header.className = "donate-header";

    const title = document.createElement("h2");
    title.textContent = "Support the Development";

    const description = document.createElement("p");
    description.textContent =
      "Sololom is a free and open-source project. If you find it useful, consider supporting its ongoing development.";

    header.appendChild(title);
    header.appendChild(description);

    // Create wallet options
    const walletOptions = document.createElement("div");
    walletOptions.className = "donate-options";

    // Bitcoin option
    if (this.options.wallets.btc) {
      const btcOption = this.createWalletOption(
        "Bitcoin (BTC)",
        this.options.wallets.btc,
        "btcAddress"
      );
      walletOptions.appendChild(btcOption);
    }

    // Ethereum option
    if (this.options.wallets.eth) {
      const ethOption = this.createWalletOption(
        "Ethereum (ETH)",
        this.options.wallets.eth,
        "ethAddress"
      );
      walletOptions.appendChild(ethOption);
    }

    // Ethereum option
    if (this.options.wallets.trx) {
      const ethOption = this.createWalletOption(
        "Tron (TRX)",
        this.options.wallets.trx,
        "trxAddress"
      );
      walletOptions.appendChild(ethOption);
    }
    // Thank you message
    const thankYou = document.createElement("div");
    thankYou.className = "thank-you";
    thankYou.innerHTML = `
      <h3>Thank You!</h3>
      <p>Your support is greatly appreciated and helps make this project possible.</p>
    `;

    // Assemble all components
    donateSection.appendChild(header);
    donateSection.appendChild(walletOptions);
    donateSection.appendChild(thankYou);

    // Add to container
    this.container.appendChild(donateSection);
  }

  /**
   * Creates a wallet option element
   *
   * @param {string} name - Cryptocurrency name
   * @param {string} address - Wallet address
   * @param {string} id - Element ID for the address
   * @returns {HTMLElement} - The wallet option element
   */
  createWalletOption(name, address, id) {
    const option = document.createElement("div");
    option.className = "crypto-option";

    const title = document.createElement("h4");
    title.textContent = name;

    const addressContainer = document.createElement("div");
    addressContainer.className = "wallet-address";

    const addressCode = document.createElement("code");
    addressCode.id = id;
    addressCode.textContent = address;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.dataset.target = id;
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => this.handleCopy(id));

    addressContainer.appendChild(addressCode);
    addressContainer.appendChild(copyBtn);

    option.appendChild(title);
    option.appendChild(addressContainer);

    return option;
  }

  /**
   * Handles copying wallet address to clipboard
   *
   * @param {string} id - Element ID of the address to copy
   */
  handleCopy(id) {
    const addressElement = document.getElementById(id);

    if (addressElement) {
      const address = addressElement.textContent;

      navigator.clipboard
        .writeText(address)
        .then(() => {
          // Find and update the button
          const button = this.container.querySelector(
            `button[data-target="${id}"]`
          );
          if (button) {
            const originalText = button.textContent;
            button.textContent = "Copied!";

            setTimeout(() => {
              button.textContent = originalText;
            }, 2000);
          }

          // Show toast
          showToast("Address copied to clipboard", "success");

          // Call onCopy callback if provided
          if (this.options.onCopy) {
            this.options.onCopy(address, id);
          }
        })
        .catch((err) => {
          console.error("Failed to copy address:", err);
          showToast("Failed to copy address", "error");
        });
    }
  }

  /**
   * Updates wallet addresses
   *
   * @param {Object} wallets - New wallet addresses
   */
  updateWallets(wallets) {
    this.options.wallets = {
      ...this.options.wallets,
      ...wallets,
    };

    // Re-render with new addresses
    this.render();
  }

  /**
   * Gets the current wallet addresses
   *
   * @returns {Object} - Current wallet addresses
   */
  getWallets() {
    return { ...this.options.wallets };
  }
}
