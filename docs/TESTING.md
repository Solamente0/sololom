# Sololom Testing Guide

This document outlines the testing strategy and procedures for the Sololom browser extension. Thorough testing is essential to ensure a high-quality, reliable product that meets user expectations.

## Testing Overview

Our testing approach includes several layers:

1. **Unit Tests**: Testing individual functions and components in isolation
2. **Integration Tests**: Testing interactions between components and services
3. **End-to-End Tests**: Testing complete user flows
4. **Cross-Browser Testing**: Ensuring compatibility across different browsers
5. **Manual Testing**: Human verification of functionality and user experience

## Test Environment Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Jest testing framework
- jsdom for DOM simulation

### Installation

```bash
# Clone the repository
git clone https://github.com/solamente0/sololom.git
cd sololom

# Install dependencies (including testing tools)
npm install

# Make sure Jest is properly configured
npx jest --version
```

### Configuration Files

- `jest.config.js`: Jest configuration
- `test/setupTests.js`: Test environment setup
- `test/mocks`: Mock implementations for testing

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests for a specific file
npm test -- test/utils/helpers.test.js

# Run tests matching a specific pattern
npm test -- -t "MessageBubble Component"

# Watch mode (re-run tests on file changes)
npm test -- --watch
```

### Test Coverage

```bash
# Generate test coverage report
npm test -- --coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## Test Structure

### Directory Structure

```
test/
├── components/
│   ├── chat/
│   │   ├── Chat.test.js
│   │   └── MessageBubble.test.js
│   └── ui/
│       ├── ModelSelector.test.js
│       └── SettingsModal.test.js
├── services/
│   ├── api.test.js
│   ├── settings.test.js
│   └── storage.test.js
├── utils/
│   ├── errorHandler.test.js
│   ├── helpers.test.js
│   └── messaging.test.js
├── mocks/
│   └── styleMock.js
├── setupTests.js
└── customSequencer.js
```

### Test File Naming

- Test files should be named with the `.test.js` suffix
- The test file should be in a similar path to the file it's testing
- Example: `src/utils/helpers.js` → `test/utils/helpers.test.js`

### Test Case Organization

For each test file:

1. **Import modules** being tested and their dependencies
2. **Mock dependencies** that shouldn't be called directly
3. **Describe blocks** to group related tests
4. **Setup and teardown** with beforeEach/afterEach
5. **Individual test cases** for specific functionality

Example structure:

```javascript
/**
 * Tests for [Component/Utility/Service]
 */

import { functionToTest } from '@/path/to/file';

// Mock dependencies if needed
jest.mock('@/path/to/dependency');

describe('Component/Utility/Service Name', () => {
  // Setup before tests
  beforeEach(() => {
    // Setup code
  });
  
  // Cleanup after tests
  afterEach(() => {
    // Cleanup code
  });
  
  describe('Specific Feature/Function', () => {
    it('should do something specific', () => {
      // Test code
      expect(result).toBe(expectedValue);
    });
    
    it('should handle error cases', () => {
      // Test error handling
      expect(() => functionToTest(invalidInput)).toThrow();
    });
  });
  
  // More describe blocks for other features
});
```

## Testing Guidelines

### Unit Testing Best Practices

1. **Test one thing per test**: Each test should verify a single aspect of functionality
2. **Arrange, Act, Assert**: Structure tests clearly with setup, action, and verification
3. **Use descriptive test names**: They should describe what is being tested and the expected outcome
4. **Mock external dependencies**: Tests should be isolated from external services
5. **Test edge cases**: Include boundary conditions and error scenarios
6. **Keep tests fast**: Unit tests should run quickly for rapid feedback

### Component Testing

For UI components, focus on:

1. **Rendering**: Does the component render correctly?
2. **Props and state**: Does it handle props and manage state properly?
3. **User interactions**: Does it respond correctly to clicks, inputs, etc.?
4. **Conditional rendering**: Does it show/hide elements correctly based on conditions?
5. **Callbacks**: Are event handlers and callbacks fired as expected?

Example component test:

```javascript
describe('MessageBubble Component', () => {
  it('should render user message correctly', () => {
    const options = {
      role: 'user',
      content: 'Hello world'
    };
    
    const messageBubble = new MessageBubble(options);
    const element = messageBubble.getElement();
    
    expect(element.className).toContain('message-user');
    expect(element.innerHTML).toContain('Hello world');
  });
  
  it('should copy content when copy button is clicked', () => {
    // Test setup
    
    // Simulate click on copy button
    
    // Verify clipboard API was called
  });
});
```

### Service Testing

For services (API, Storage, Settings), focus on:

1. **API contracts**: Do they expose the expected interface?
2. **Data handling**: Do they process data correctly?
3. **Error handling**: Do they handle errors gracefully?
4. **Integration**: Do they interact with other services correctly?

Example service test:

```javascript
describe('API Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn(); // Mock fetch
  });
  
  it('should call the correct OpenAI endpoint', async () => {
    // Setup mock response
    
    // Call service method
    await ApiService.getLLMResponse({ model: 'gpt-3.5-turbo', messages: [] });
    
    // Verify correct endpoint was called with right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.any(Object)
    );
  });
});
```

### Integration Testing

For integration between components:

1. **Communication**: Do components exchange data correctly?
2. **State changes**: Does state flow through the system as expected?
3. **Event handling**: Are events propagated correctly?

Example integration test:

```javascript
describe('Chat with Model Selection Integration', () => {
  it('should update chat when model is changed', async () => {
    // Setup both components
    
    // Trigger model change
    
    // Verify chat component updated correctly
  });
});
```

### Mocking

Use Jest's mocking capabilities to isolate the code being tested:

1. **Function mocks**: `jest.fn()`
2. **Module mocks**: `jest.mock()`
3. **Timer mocks**: `jest.useFakeTimers()`
4. **Browser API mocks**: Define in setupTests.js

Example:

```javascript
// Mock chrome API
jest.mock('@/utils/chrome', () => ({
  storage: {
    get: jest.fn().mockResolvedValue({ key: 'value' }),
    set: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock fetch API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'response' })
});
```

## Manual Testing Checklist

Beyond automated tests, perform these manual checks:

### Installation Testing
- [ ] Fresh installation works correctly
- [ ] Updates install without issues
- [ ] Extension can be disabled and re-enabled
- [ ] Extension can be uninstalled cleanly

### Functionality Testing
- [ ] Popup opens correctly
- [ ] Full-page interface opens
- [ ] Chat messages are sent and received
- [ ] Settings are saved and applied
- [ ] Different LLM models can be selected
- [ ] Conversations are saved and restored
- [ ] Theme switching works

### Cross-Browser Testing
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Edge (latest version)
- [ ] Chrome on Android (if applicable)
- [ ] Firefox on Android (if applicable)

### Edge Cases
- [ ] Very long messages
- [ ] Network interruptions
- [ ] Invalid API keys
- [ ] Rate limit handling
- [ ] Large conversation history
- [ ] Different screen sizes
- [ ] High-contrast/accessibility settings

## Continuous Integration

To automate testing in the CI pipeline:

1. Setup GitHub Actions workflow:
   ```yaml
   name: Test
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 16
         - run: npm ci
         - run: npm test
   ```

2. Set minimum coverage requirements:
   ```javascript
   // In jest.config.js
   coverageThreshold: {
     global: {
       branches: 70,
       functions: 70,
       lines: 70,
       statements: 70
     }
   }
   ```

## Reporting Issues

When reporting test failures:

1. **Clearly describe the test failure**
2. **Include the full error message and stack trace**
3. **Note the test file and line number**
4. **Include steps to reproduce manually if possible**
5. **Note the environment (Node.js version, browser, OS)**

## Conclusion

A comprehensive testing strategy is essential for maintaining a high-quality extension. By combining automated tests with manual verification, we can ensure Sololom provides a reliable and enjoyable user experience.

Remember that tests are also documentation - they demonstrate how components and functions are expected to work, making it easier for new contributors to understand the codebase.

---

© 2025 Omid Nateghi (omidnateghiofficial@gmail.com). All rights reserved.
