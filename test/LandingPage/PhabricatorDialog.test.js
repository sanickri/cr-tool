import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhabricatorDialog from '../../src/LandingPage/PhabricatorDialog';
import PhabricatorAPI from '../../src/utils/phabricatorUtils';

// Mock the Dialog component from Material-UI
jest.mock('@mui/material/Dialog', () => {
  return function MockDialog(props) {
    if (!props.open) return null;
    return (
      <div data-testid="phabricator-dialog-mock">
        {props.children}
      </div>
    );
  };
});

// Mock PhabricatorAPI
jest.mock('../../src/utils/phabricatorUtils', () => {
  const mockPhabAPI = jest.fn().mockImplementation(() => {
    return {
      getUserInfo: jest.fn().mockResolvedValue([{
        phid: 'PHID-USER-123',
        fields: {
          username: 'testuser',
          realName: 'Test User',
          image: 'avatar-url'
        }
      }]),
      getTransformedRevisions: jest.fn().mockResolvedValue([{id: 1, title: 'D123: Test revision'}])
    };
  });
  
  return mockPhabAPI;
});

describe('PhabricatorDialog Component', () => {
  // Updated mock props to match actual component props
  const mockProps = {
    phabricatorDialogOpen: true,
    setPhabricatorDialogOpen: jest.fn(),
    phabricatorUrl: 'http://phab.example.com',
    setPhabricatorUrl: jest.fn(),
    phabricatorToken: 'api-token-xyz',
    setPhabricatorToken: jest.fn(),
    setIsPhabConnected: jest.fn(),
    updateRevisionsForSource: jest.fn(),
    setIsFetching: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Spy on localStorage methods
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'clear');
    jest.spyOn(Storage.prototype, 'removeItem');
    
    // Mock environment variables
    process.env = {
      ...process.env,
      REACT_APP_PHID: 'PHID-TEST-123'
    };
  });

  // Simple render test
  test('should render dialog when open', () => {
    render(<PhabricatorDialog {...mockProps} />);
    expect(screen.getByTestId('phabricator-dialog-mock')).toBeInTheDocument();
    expect(screen.getByText(/connect phabricator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api url/i)).toHaveValue(mockProps.phabricatorUrl);
    expect(screen.getByLabelText(/api token/i)).toHaveValue(mockProps.phabricatorToken);
  });

  test('should not render when open is false', () => {
    render(<PhabricatorDialog {...mockProps} phabricatorDialogOpen={false} />);
    expect(screen.queryByTestId('phabricator-dialog-mock')).not.toBeInTheDocument();
  });

  test('should update input fields on change', async () => {
    // Instead of using userEvent which can be flaky, use fireEvent
    render(<PhabricatorDialog {...mockProps} />);
    
    const urlInput = screen.getByLabelText(/api url/i);
    fireEvent.change(urlInput, { target: { value: 'new-phab-url' } });
    expect(mockProps.setPhabricatorUrl).toHaveBeenCalledWith('new-phab-url');
    
    const tokenInput = screen.getByLabelText(/api token/i);
    fireEvent.change(tokenInput, { target: { value: 'new-token' } });
    expect(mockProps.setPhabricatorToken).toHaveBeenCalledWith('new-token');
  });

  test('should call onClose when cancel button is clicked', () => {
    render(<PhabricatorDialog {...mockProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockProps.setPhabricatorDialogOpen).toHaveBeenCalledWith(false);
  });

  test('should save settings and call API on Connect button click', async () => {
    render(<PhabricatorDialog {...mockProps} />);
    
    // Be more specific to find the Connect button, not text in the title or content
    const connectButton = screen.getByRole('button', { name: 'Connect' });
    fireEvent.click(connectButton);
    
    // Check localStorage calls
    expect(localStorage.setItem).toHaveBeenCalledWith('phabricatorUrl', mockProps.phabricatorUrl);
    expect(localStorage.setItem).toHaveBeenCalledWith('phabricatorToken', mockProps.phabricatorToken);
    
    // Check that connection state is updated
    expect(mockProps.setIsPhabConnected).toHaveBeenCalledWith(true);
    expect(mockProps.setPhabricatorDialogOpen).toHaveBeenCalledWith(false);
  });
});
