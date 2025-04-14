module.exports = {
  testEnvironment: 'jest-environment-jsdom', // Use jsdom environment
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // Run setup file
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest', // Use babel-jest to transpile JS/JSX
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
}; 