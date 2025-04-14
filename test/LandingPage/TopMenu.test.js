import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TopMenu from '../../src/LandingPage/TopMenu';

// Mock Material-UI components to avoid issues
jest.mock('@mui/material/Menu', () => {
  return function MockMenu(props) {
    if (!props.open) return null;
    return (
      <div data-testid="menu-mock" role="menu">
        {props.children}
      </div>
    );
  };
});

jest.mock('@mui/material/MenuItem', () => {
  return function MockMenuItem(props) {
    return (
      <div 
        data-testid={`menu-item-mock-${props.children}`} 
        role="menuitem" 
        onClick={props.onClick}
      >
        {props.children}
      </div>
    );
  };
});

// Mock AppBar and Toolbar
jest.mock('@mui/material/AppBar', () => {
  return function MockAppBar(props) {
    return (
      <header data-testid="top-menu" {...props}>
        {props.children}
      </header>
    );
  };
});

jest.mock('@mui/material/Toolbar', () => {
  return function MockToolbar(props) {
    // Extract disableGutters from props to prevent passing it to the div
    const { disableGutters, ...otherProps } = props;
    return <div {...otherProps}>{props.children}</div>;
  };
});

// Mock dayjs with the necessary functions
jest.mock('dayjs', () => {
  const mockDayjs = () => ({
    format: () => '2023-01-01',
    add: () => mockDayjs(),  // Return the mockDayjs to allow chaining
    subtract: () => mockDayjs(),
    startOf: () => mockDayjs(),
    endOf: () => mockDayjs(),
    isValid: () => true,
    isBefore: () => false,
    isAfter: () => false,
    isSame: () => true
  });
  
  // Add static methods or properties
  mockDayjs.extend = jest.fn();
  mockDayjs.locale = jest.fn();
  
  return mockDayjs;
});

describe('TopMenu Component', () => {
  const mockProps = {
    setGitlabDialogOpen: jest.fn(),
    setPhabricatorDialogOpen: jest.fn(),
    setFetchDialogOpen: jest.fn(),
    isGitlabConnected: false,
    isPhabricatorConnected: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Spy on localStorage methods
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'clear');
    jest.spyOn(Storage.prototype, 'removeItem');
  });

  const renderTopMenu = (props = mockProps) => {
    // Don't create duplicate connection status elements since TopMenu has its own
    const utils = render(
      <BrowserRouter>
        <TopMenu {...props} />
      </BrowserRouter>
    );
    return utils;
  };

  test('should render with Toolbar and AppBar components', () => {
    renderTopMenu();
    // Check for the AppBar/Toolbar structure
    expect(screen.getByTestId('top-menu')).toBeInTheDocument();
    // Check for app titles which are part of the TopMenu
    expect(screen.getByTestId('app-title-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('app-title-mobile')).toBeInTheDocument();
  });

  test('should show application title with correct text', () => {
    renderTopMenu();
    const desktopTitle = screen.getByTestId('app-title-desktop');
    expect(desktopTitle).toHaveTextContent('TERROR');
  });

  test('should have navigation menu icon', () => {
    renderTopMenu();
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  // Handle missing avatar_url test
  test('should handle missing avatar_url gracefully', () => {
    renderTopMenu();
    // Just verify it renders without errors
    expect(screen.getByTestId('top-menu')).toBeInTheDocument();
  });

  test('should open user menu when settings button is clicked', () => {
    renderTopMenu();
    const settingsButton = screen.getByLabelText(/open settings/i);
    fireEvent.click(settingsButton);
    
    expect(screen.getByTestId('menu-mock')).toBeInTheDocument();
  });
});
