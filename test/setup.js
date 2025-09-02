// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
process.env.JASPER_USERNAME = 'jasperadmin';
process.env.JASPER_PASSWORD = 'jasperadmin';
process.env.JASPER_AUTH_TYPE = 'basic';
process.env.JASPER_DEBUG_MODE = 'false';

// Global test utilities
global.testConfig = {
  jasperUrl: process.env.JASPER_URL,
  username: process.env.JASPER_USERNAME,
  password: process.env.JASPER_PASSWORD,
  authType: process.env.JASPER_AUTH_TYPE,
};

// Global cleanup tracking
global.activeTimers = new Set();
global.activeIntervals = new Set();
global.activeTimeouts = new Set();

// Override timer functions to track them
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

global.setTimeout = (fn, delay, ...args) => {
  const id = originalSetTimeout(fn, delay, ...args);
  global.activeTimeouts.add(id);
  return id;
};

global.setInterval = (fn, delay, ...args) => {
  const id = originalSetInterval(fn, delay, ...args);
  global.activeIntervals.add(id);
  return id;
};

global.clearTimeout = id => {
  global.activeTimeouts.delete(id);
  return originalClearTimeout(id);
};

global.clearInterval = id => {
  global.activeIntervals.delete(id);
  return originalClearInterval(id);
};

// Global cleanup function
global.cleanupTimers = () => {
  // Clear all active timeouts
  for (const id of global.activeTimeouts) {
    originalClearTimeout(id);
  }
  global.activeTimeouts.clear();

  // Clear all active intervals
  for (const id of global.activeIntervals) {
    originalClearInterval(id);
  }
  global.activeIntervals.clear();
};

// Setup global afterEach hook for cleanup
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    global.cleanupTimers();
  });
}
