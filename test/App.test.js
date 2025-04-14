import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App'; // Adjust the path as needed
import * as gitlabUtils from '../src/utils/gitlabUtils'; // To mock functions

// Mock the gitlabUtils module
jest.mock('../src/utils/gitlabUtils');

describe('App Component', () => {
  beforeEach(() => {
    // Jest mocks are reset automatically if clearMocks: true in config
    gitlabUtils.isGitlabTokenValid.mockReturnValue(true);

    localStorage.clear();
    // Use actual dayjs if available, or mock specific instances if needed later
    // For localStorage setup, a simple date string might suffice if dayjs isn't critical here
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);
    localStorage.setItem('gitlabToken', JSON.stringify({ token: 'mock-token', expires: expiryDate.toISOString() }));
    localStorage.setItem('gitlabUrl', 'http://mock.gitlab.url');
  });

  // Wrap render in BrowserRouter for routing context -- NO, App provides its own
  const renderApp = () => render(<App />); // Render App directly

  test('should render without crashing', () => {
    renderApp();
    // Use Jest matchers (@testing-library/jest-dom)
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expect(screen.getByTestId('top-menu')).toBeInTheDocument();
  });

  test('should render TopMenu component', () => {
    renderApp();
    expect(screen.getByTestId('top-menu')).toBeInTheDocument();
  });

  test('should render LandingPage component on root route', () => {
     renderApp();
     expect(screen.getByTestId('landing-page')).toBeInTheDocument();
   });

   test('should correctly reflect initial GitLab connection state (connected)', () => {
     // Mock behavior is set in beforeEach
     renderApp();
     // Use text content matcher
     expect(screen.getByTestId('gitlab-connection-status')).toHaveTextContent('Connected');
   });

   test('should correctly reflect initial GitLab connection state (not connected)', () => {
     // Override the default mock behavior for this specific test
     gitlabUtils.isGitlabTokenValid.mockReturnValue(false);
     localStorage.removeItem('gitlabToken');
     renderApp();
     expect(screen.getByTestId('gitlab-connection-status')).toHaveTextContent('Not Connected');
   });

   test('should correctly reflect initial Phabricator connection state (not connected)', () => {
     renderApp();
     // Assume not connected by default
     // Use Jest matcher
     expect(screen.getByTestId('phabricator-connection-status')).toHaveTextContent('Not Connected');
   });

   test('should correctly reflect initial Phabricator connection state (connected)', () => {
      localStorage.setItem('phabricatorUrl', 'http://example.com');
      localStorage.setItem('phabricatorToken', 'valid-token');
      renderApp();
      // Use Jest matcher
      expect(screen.getByTestId('phabricator-connection-status')).toHaveTextContent('Connected');
    });

});
