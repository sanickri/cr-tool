module.exports = {
  testEnvironment: 'jest-environment-jsdom', // Use jsdom environment
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // Run setup file
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest', // Use babel-jest to transpile JS/JSX
  },
  transformIgnorePatterns: [
    // More comprehensive pattern to handle ESM modules
    'node_modules/(?!(.+/(?!.*\\.mjs$).*|@uiw|unist|rehype|unified|hast|bail|trough|vfile|mdast|micromark|decode-named-character-reference|parse-entities|character-entities|property-information|character-reference-invalid|is-plain-obj|space-separated-tokens|comma-separated-tokens|react-diff-view)/)'
  ],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
}; 