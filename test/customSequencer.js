/**
 * Custom test sequencer for Jest
 * Ensures that tests run in a specific order
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Sort test files based on their path and priority
   * @param {Array} tests - Array of test files to sort
   * @returns {Array} - Sorted array of test files
   */
  sort(tests) {
    // Return a new array with sorted tests
    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;
      
      // Run utils tests first
      if (pathA.includes('/utils/') && !pathB.includes('/utils/')) {
        return -1;
      }
      if (!pathA.includes('/utils/') && pathB.includes('/utils/')) {
        return 1;
      }
      
      // Then run services tests
      if (pathA.includes('/services/') && !pathB.includes('/services/')) {
        return -1;
      }
      if (!pathA.includes('/services/') && pathB.includes('/services/')) {
        return 1;
      }
      
      // Then run components tests
      if (pathA.includes('/components/') && !pathB.includes('/components/')) {
        return -1;
      }
      if (!pathA.includes('/components/') && pathB.includes('/components/')) {
        return 1;
      }
      
      // Default to alphabetical order
      return pathA.localeCompare(pathB);
    });
  }
}

module.exports = CustomSequencer;
