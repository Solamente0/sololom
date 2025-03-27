/**
 * Jest setup file to configure the testing environment
 */

// Mock chrome browser API
global.chrome = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        callback({});
      }
      return true;
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://mockextensionid/${path}`),
    lastError: null,
    openOptionsPage: jest.fn()
  },
  storage: {
    sync: {
      get: jest.fn().mockImplementation((keys, callback) => {
        const result = {};
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation(callback => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    },
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        const result = {};
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation(callback => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    sendMessage: jest.fn()
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  }
};

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    readText: jest.fn().mockImplementation(() => Promise.resolve(''))
  },
  configurable: true
});

// Mock console methods to suppress outputs during tests
// But keep track of calls for assertions
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create DOM elements for testing
global.createTestElement = (tagName, id, attributes = {}) => {
  const element = document.createElement(tagName);
  element.id = id;
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  document.body.appendChild(element);
  return element;
};

// Helper to clean up test elements
global.removeTestElement = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
};
