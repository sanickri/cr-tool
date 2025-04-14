import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RevisionsList from '../../src/Revisions/RevisionsList'; // Adjust path

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Use actual implementations for things like BrowserRouter
  useNavigate: () => mockNavigate, // Mock useNavigate hook
}));

// Mock dayjs
jest.mock('dayjs', () => {
  const dayjs = jest.requireActual('dayjs')
  const mockDayjs = (...args) => dayjs(...args)
  mockDayjs.prototype = Object.create(dayjs.prototype)
  mockDayjs.prototype.isAfter = jest.fn(() => true)
  mockDayjs.prototype.isValid = jest.fn(() => true)
  mockDayjs.prototype.add = jest.fn().mockReturnThis()
  mockDayjs.prototype.toISOString = jest.fn(() => new Date().toISOString())
  return mockDayjs
})

describe('RevisionsList Component (RevisionsDataGrid)', () => {

  const mockRevision = {
    id: 'D123',
    title: 'Test Revision Title',
    status: 'Needs Review',
    url: 'http://example.com/D123',
    author: 'testuser',
    dateModified: new Date().toISOString(),
    isDraft: false,
    project: 'Test Project',
    projectUrl: 'http://example.com/project/test',
    projectId: 'P1',
    color: 'blue',
    iid: '123',
    jiraId: 'JIRA-1',
    following: false,
    source: 'P' // Or 'G'
  };

  const defaultProps = {
    revisions: [[mockRevision]], // Nested array structure
    isFetching: false,
  };

  // Helper to render with Router context
  const renderRevisionsList = (props = defaultProps) => {
    return render(
      <BrowserRouter>
        <RevisionsList {...props} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Jest mocks are reset automatically if clearMocks: true in config
    mockNavigate.mockClear(); // Clear specific mock history if needed
    localStorage.clear();
    // Mock localStorage items needed by RevisionsList
    localStorage.setItem('dataGridFilterModel', JSON.stringify({ items: [] }));
    localStorage.setItem('userGroups', JSON.stringify([]));
    localStorage.setItem('projectGroups', JSON.stringify([]));
  });

  test('should render without crashing when revisions are provided', () => {
    renderRevisionsList();
    expect(screen.getByTestId('revisions-list')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  test('should display "No revisions found" alert when revisions array is empty', () => {
    renderRevisionsList({ revisions: [[]], isFetching: false });
    expect(screen.getByText('No revisions found')).toBeInTheDocument();
  });

   test('should display "No revisions found" alert when revisions is null', () => {
     renderRevisionsList({ revisions: null, isFetching: false });
     expect(screen.getByText('No revisions found')).toBeInTheDocument();
   });

  test('should render filter controls (Project, Author, Draft)', () => {
    renderRevisionsList();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Author')).toBeInTheDocument();
    expect(screen.getByLabelText('Draft')).toBeInTheDocument();
    expect(screen.getByLabelText('User group')).toBeInTheDocument();
  });

  test('should display revision data in the grid', () => {
    renderRevisionsList();
    expect(screen.getByText(mockRevision.title)).toBeInTheDocument();
    expect(screen.getByText(mockRevision.author)).toBeInTheDocument();
    expect(screen.getByText(mockRevision.project)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mockRevision.id })).toBeInTheDocument();
     if (mockRevision.jiraId) {
       expect(screen.getByRole('link', { name: mockRevision.jiraId })).toBeInTheDocument();
     }
  });

  // TODO: Add tests for:
  // - Clicking a row (checking mockNavigate call: expect(mockNavigate).toHaveBeenCalledWith(...))
  // - Applying filters (using userEvent.selectOptions, userEvent.type, etc.)
  // - Handling localStorage parsing errors gracefully
  // - Handling `isFetching` state

});
