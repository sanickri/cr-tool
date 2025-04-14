import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FetchProjectsDialog from '../../src/LandingPage/FetchProjectsDialog';
import * as gitlabUtils from '../../src/utils/gitlabUtils';

// Mock the Material-UI Dialog component
jest.mock('@mui/material/Dialog', () => {
  return function MockDialog(props) {
    if (!props.open) return null;
    return (
      <div data-testid="dialog-mock" role="dialog">
        {props.children}
      </div>
    );
  };
});

// Mock the gitlab utils
jest.mock('../../src/utils/gitlabUtils', () => ({
  getProjectsByIds: jest.fn().mockResolvedValue([{ id: 123, name: 'ID Project' }]),
  getStarredGitlabProjects: jest.fn().mockResolvedValue([{ id: 2, name: 'Starred B' }]),
  getGitlabProjects: jest.fn().mockResolvedValue([{ id: 1, name: 'Project A' }]),
  getTransformedGitlabMRs: jest.fn().mockResolvedValue([{ id: 1, title: 'MR 1' }])
}));

describe('FetchProjectsDialog Component', () => {
  const mockProps = {
    fetchDialogOpen: true,
    setFetchDialogOpen: jest.fn(),
    projectIds: '123,456',
    setProjectIds: jest.fn(),
    setHasGitProjects: jest.fn(),
    setIsFetching: jest.fn(),
    updateRevisionsForSource: jest.fn()
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

  test('should render dialog with correct title when open', () => {
    render(<FetchProjectsDialog {...mockProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/gitlab projects/i)).toBeInTheDocument();
  });

  test('should not render when open is false', () => {
    render(<FetchProjectsDialog {...mockProps} fetchDialogOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('should display project IDs input field', () => {
    render(<FetchProjectsDialog {...mockProps} />);
    const input = screen.getByLabelText(/project ids/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(mockProps.projectIds);
  });

  test('should call setProjectIds on input change', () => {
    render(<FetchProjectsDialog {...mockProps} />);
    
    const input = screen.getByLabelText(/project ids/i);
    // Use fireEvent instead of userEvent
    fireEvent.change(input, { target: { value: '789' } });
    
    expect(mockProps.setProjectIds).toHaveBeenCalledWith('789');
  });

  test('should call correct utils and update state on fetch "by IDs" click', async () => {
    render(<FetchProjectsDialog {...mockProps} />);
    
    // Simulate click on button with text "by IDs" instead of using role
    fireEvent.click(screen.getByText('by IDs'));
    
    await waitFor(() => {
      expect(gitlabUtils.getProjectsByIds).toHaveBeenCalledWith(mockProps.projectIds);
    });
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'gitProjects', 
        JSON.stringify([{ id: 123, name: 'ID Project' }])
      );
      expect(mockProps.setHasGitProjects).toHaveBeenCalledWith(true);
    });
  });

  test('should call correct utils and update state on fetch "starred" click', async () => {
    render(<FetchProjectsDialog {...mockProps} />);
    
    // Simulate click on button with text "starred" instead of using role
    fireEvent.click(screen.getByText('starred'));
    
    await waitFor(() => {
      expect(gitlabUtils.getStarredGitlabProjects).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'gitProjects', 
        JSON.stringify([{ id: 2, name: 'Starred B' }])
      );
      expect(mockProps.setHasGitProjects).toHaveBeenCalledWith(true);
    });
  });

  test('should call correct utils and update state on fetch "All" click', async () => {
    render(<FetchProjectsDialog {...mockProps} />);
    
    // Simulate click on button with text "All" instead of using role
    fireEvent.click(screen.getByText('All'));
    
    await waitFor(() => {
      expect(gitlabUtils.getGitlabProjects).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'gitProjects', 
        JSON.stringify([{ id: 1, name: 'Project A' }])
      );
      expect(mockProps.setHasGitProjects).toHaveBeenCalledWith(true);
    });
  });

  test('should call onClose when cancel button is clicked', () => {
    render(<FetchProjectsDialog {...mockProps} />);
    fireEvent.click(screen.getByText('Close'));
    expect(mockProps.setFetchDialogOpen).toHaveBeenCalledWith(false);
  });
});
