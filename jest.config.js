module.exports = {
  // The root directory that Jest should scan for tests
  rootDir: '.',
  
  // The test environment that will be used for testing
  // 'jsdom' provides browser-like environment
  testEnvironment: 'jsdom',
  
  // Glob patterns Jest uses to detect test files
  testMatch: [
    '**/test/**/*.test.js',
    '**/src/**/*.test.js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  // Tests that match will be skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // An array of regexp pattern strings that are matched against all source paths
  // Matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Automatically reset mock state before every test
  resetMocks: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Indicates whether the coverage information should be collected
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of glob patterns indicating a set of files for which coverage 
  // information should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  
  // The test coverage threshold to enforce
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files that will be run before each test
  setupFilesAfterEnv: [
    '<rootDir>/test/setupTests.js'
  ],
  
  // Mock files
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/mocks/styleMock.js'
  },
  
  // Define test sequencer
  testSequencer: '<rootDir>/test/customSequencer.js'
};
