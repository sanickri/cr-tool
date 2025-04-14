import React from 'react';
import { render, screen } from '@testing-library/react';
import GitlabDialog from '../../src/LandingPage/GitlabDialog';
import * as gitlabUtils from '../../src/utils/gitlabUtils';

// Mock the Date Picker components
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }) => (
    <input 
      type="text" 
      aria-label={label} 
      value={value ? value.format('YYYY-MM-DD') : ''} 
      onChange={e => onChange(e.target.value)}
      data-testid="mock-date-picker"
    />
  )
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }) => <div>{children}</div>
}));

jest.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  AdapterDayjs: function MockAdapter() {}
}));

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

// Mock the Dialog component from Material-UI
jest.mock('@mui/material/Dialog', () => {
  return function MockDialog(props) {
    if (!props.open) return null;
    return (
      <div data-testid="dialog-mock">
        {props.children}
      </div>
    );
  };
});

// Mock the gitlabConnect util function
jest.mock('../../src/utils/gitlabUtils', () => ({
  gitlabConnect: jest.fn()
}));

describe('GitlabDialog Component', () => {
  // Updated mock props to match component's prop names
  const mockProps = {
    gitlabDialogOpen: true,
    setGitlabDialogOpen: jest.fn(),
    gitlabUrl: 'http://gitlab.example.com',
    setGitlabUrl: jest.fn(),
    gitlabAppId: '12345',
    setGitlabAppId: jest.fn(),
    gitlabSecret: 'secret',
    setGitlabSecret: jest.fn(),
    gitlabRedirectUri: 'http://localhost:3000/callback',
    setGitlabRedirectUri: jest.fn(),
    gitlabExpirationDate: null,
    setGitlabExpirationDate: jest.fn()
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

  // Simple mock rendering test - this should pass even if the dialog isn't fully implemented
  test('should render without crashing', () => {
    render(<GitlabDialog {...mockProps} />);
    // If component renders without errors, this test passes
    expect(screen.getByTestId('dialog-mock')).toBeInTheDocument();
  });

  test('should not render when open is false', () => {
    render(<GitlabDialog {...mockProps} gitlabDialogOpen={false} />);
    expect(screen.queryByTestId('dialog-mock')).not.toBeInTheDocument();
  });

  test('should render dialog with correct title', () => {
    render(<GitlabDialog {...mockProps} />);
    expect(screen.getByText(/connect gitlab/i)).toBeInTheDocument();
  });

  test('should render all form fields', () => {
    render(<GitlabDialog {...mockProps} />);
    expect(screen.getByLabelText(/gitlab url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/application id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gitlab secret/i)).toBeInTheDocument();
  });

  test('should call onClose when cancel button is clicked', () => {
    render(<GitlabDialog {...mockProps} />);
    screen.getByRole('button', { name: /cancel/i }).click();
    expect(mockProps.setGitlabDialogOpen).toHaveBeenCalledTimes(1);
    expect(mockProps.setGitlabDialogOpen).toHaveBeenCalledWith(false);
  });

  test('should call onConnect when connect button is clicked', () => {
    render(<GitlabDialog {...mockProps} />);
    screen.getByRole('button', { name: /connect/i }).click();
    expect(gitlabUtils.gitlabConnect).toHaveBeenCalledTimes(1);
  });


  test('should call localStorage setters and gitlabConnect on Connect button click', () => {
    render(<GitlabDialog {...mockProps} />);
    screen.getByRole('button', { name: /connect/i }).click();
    
    // Check localStorage calls
    expect(localStorage.setItem).toHaveBeenCalledWith('gitlabUrl', mockProps.gitlabUrl);
    expect(localStorage.setItem).toHaveBeenCalledWith('gitlabAppId', mockProps.gitlabAppId);
    expect(localStorage.setItem).toHaveBeenCalledWith('gitlabSecret', mockProps.gitlabSecret);
    expect(localStorage.setItem).toHaveBeenCalledWith('gitlabRedirectUri', mockProps.gitlabRedirectUri);
    
    // Check gitlabConnect call
    expect(gitlabUtils.gitlabConnect).toHaveBeenCalledWith(
      mockProps.gitlabUrl, 
      mockProps.gitlabAppId, 
      mockProps.gitlabRedirectUri
    );
  });
});
