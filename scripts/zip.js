/**
 * Packages the extension into a zip file for submission to browser stores
 */

const { zip } = require('zip-a-folder');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

// Define paths
const distDir = path.join(__dirname, '../dist');
const outputDir = path.join(__dirname, '../packages');

/**
 * Creates the output directory if it doesn't exist
 */
function createOutputDir() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

/**
 * Creates a zip file for the specified browser
 * @param {string} browser - Browser name ('chrome', 'firefox', or 'edge')
 */
async function createZip(browser) {
  const version = packageJson.version;
  const filename = `sololom-${browser}-v${version}.zip`;
  const outputPath = path.join(outputDir, filename);
  
  console.log(`Creating ${filename}...`);
  
  try {
    await zip(distDir, outputPath);
    console.log(`Successfully created ${filename}`);
  } catch (error) {
    console.error(`Error creating ${filename}:`, error);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  // Determine browser from command line argument
  const browser = process.argv[2]?.toLowerCase() || 'chrome';
  
  // Validate browser
  const validBrowsers = ['chrome', 'firefox', 'edge'];
  if (!validBrowsers.includes(browser)) {
    console.error(`Invalid browser: ${browser}. Must be one of: ${validBrowsers.join(', ')}`);
    process.exit(1);
  }
  
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }
  
  // Create output directory
  createOutputDir();
  
  // Create zip file
  await createZip(browser);
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
