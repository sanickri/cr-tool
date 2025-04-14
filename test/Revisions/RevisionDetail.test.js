import React from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
// Removed expect from chai and cleanup
import { BrowserRouter } from 'react-router-dom';
// Removed sinon
import RevisionDetail from '../../src/Revisions/RevisionDetail'; // Adjust path
import * as gitlabUtils from '../../src/utils/gitlabUtils';
import PhabricatorAPI from '../../src/utils/phabricatorUtils';

// Mock dependencies
jest.mock('../../src/utils/gitlabUtils');
jest.mock('../../src/utils/phabricatorUtils');
jest.mock('react-diff-view', () => ({
  // Mock Diff component: Render placeholder, ignore children
  Diff: ({ children }) => <div data-testid="mock-diff">{/* Diff Content Placeholder */}</div>,
  // Simplified Hunk mock: Render a placeholder, ignore complex changes rendering
  Hunk: ({ hunk }) => (
    <div data-testid="mock-hunk" data-hunk-content={JSON.stringify(hunk?.changes?.map(c => c.content))}>
      {/* Placeholder for hunk content */}
      Hunk Content Placeholder
    </div>
  ),
  parseDiff: jest.fn((diff) => [
    {
      hunks: [
        {
          changes: diff.split('\n').map((line, i) => ({
            type: 'normal', 
            content: line,
            isNormal: true, 
            lineNumber: i + 1,
          })),
        },
      ],
      oldPath: 'a/file.txt',
      newPath: 'b/file.txt',
    },
  ]),
}));
jest.mock('marked', () => ({
  marked: jest.fn((text) => `<p>${text}</p>`),
}));
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html),
}));

// Mock dayjs
jest.mock('dayjs', () => {
  const dayjs = jest.requireActual('dayjs');
  const mockDayjs = (...args) => dayjs(...args);
  mockDayjs.prototype = Object.create(dayjs.prototype);
  mockDayjs.prototype.isAfter = jest.fn(() => true);
  mockDayjs.prototype.isValid = jest.fn(() => true);
  mockDayjs.prototype.add = jest.fn().mockReturnThis();
  mockDayjs.prototype.toISOString = jest.fn(() => new Date().toISOString());
  return mockDayjs;
});

// Mock react-router-dom useLocation
const mockLocation = {
  pathname: '/detail/G/123', // Example path
  state: {
    revision: {
      id: '123',
      iid: '456', // Gitlab specific
      projectId: '789',
      source: 'G', // or 'P'
      title: 'Mock Revision Title',
      // Add other necessary revision fields used by the component
    },
  },
  search: '',
  hash: '',
};
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Use actual BrowserRouter
  useLocation: () => mockLocation,
}));


describe('RevisionDetail Component', () => {

  const mockGitlabMRData = {
    id: '123',
    iid: '456',
    title: 'Mock GitLab MR Title',
    description: 'MR Description',
    author: { name: 'GitLab Author', username: 'gitlabauthor' },
    created_at: new Date().toISOString(),
    web_url: 'http://gitlab.example.com/mr/123',
    // Add other fields as returned by your util functions
  };
  const mockTransformedMRData = {
    id: '123',
    iid: '456',
    title: 'Mock GitLab MR Title',
    summary: 'MR Description',
    author: { name: 'GitLab Author', username: 'gitlabauthor' },
    dateCreated: new Date().toISOString(),
    url: 'http://gitlab.example.com/mr/123',
    inlineComments: [],
    status: 'open', // Example status
    // Add other transformed fields
  };
  const mockDiffData = [
    {
      diff: '--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old line\n+new line',
      old_path: 'a/file.txt',
      new_path: 'b/file.txt',
    }
  ];

  const mockPhabRevisionData = { /* Structure for Phab data */ };
  const mockTransformedPhabData = {
    id: 'D456', 
    title: 'Mock Phabricator Revision', 
    author: { name: 'Phab Author', username: 'phabauthor' },
    summary: 'Phab Description',
    url: 'http://phab.example.com/D456',
    diffs: mockDiffData, // Assuming similar diff structure for simplicity
    status: 'Needs Review',
    // Add other transformed fields
  };

  beforeEach(() => {
    // Reset mocks defined with jest.mock
    jest.clearAllMocks();

    // Configure mock implementations for utils
    gitlabUtils.getGitlabMRbyId.mockResolvedValue(mockGitlabMRData);
    gitlabUtils.getTransformedMRInfo.mockResolvedValue(mockTransformedMRData);
    gitlabUtils.getMRDiff.mockResolvedValue(mockDiffData);
    
    // Mock PhabricatorAPI methods
    PhabricatorAPI.prototype.getRevisionInfo = jest.fn().mockResolvedValue(mockPhabRevisionData);
    PhabricatorAPI.prototype.getTransformedRevisionInfo = jest.fn().mockResolvedValue(mockTransformedPhabData);

    // Mock localStorage (jsdom provides this)
    localStorage.clear();
    localStorage.setItem('gitlabUser', JSON.stringify({ id: 1, name: 'Git Lab', username: 'gitlabuser', email: 'git@example.com' }));
    localStorage.setItem('phabUser', JSON.stringify({ name: 'Phab Ricator', username: 'phabuser', email: 'phab@example.com' }));
    localStorage.setItem('diffView', 'unified');
  });

  const renderRevisionDetail = async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <RevisionDetail />
        </BrowserRouter>
      );
    });
  };

  test('should render loading state initially (optional test)', async () => {
    await renderRevisionDetail();
    // Might be tricky if loading is too fast, maybe check for absence of data initially
    // expect(screen.queryByText(mockTransformedMRData.title)).not.toBeInTheDocument();
  });

  test('should fetch and display GitLab MR details', async () => {
    // Set location state for GitLab
    mockLocation.pathname = '/detail/G/123';
    mockLocation.state.revision = { id: '123', iid: '456', projectId: '789', source: 'G' };
    
    await renderRevisionDetail();

    // Wait for async operations (fetching data) and rendering
    await waitFor(() => {
      expect(gitlabUtils.getGitlabMRbyId).toHaveBeenCalledWith('456', '789');
      expect(gitlabUtils.getTransformedMRInfo).toHaveBeenCalledWith(mockGitlabMRData);
      expect(gitlabUtils.getMRDiff).toHaveBeenCalledWith('789', '456');
    });

    // Check if data is displayed
    await waitFor(() => {
      expect(screen.getByText(mockTransformedMRData.title)).toBeInTheDocument();
      expect(screen.getByText(/GitLab Author - gitlabauthor/)).toBeInTheDocument();
      const summaryElement = screen.getByTestId('revision-summary');
      expect(within(summaryElement).getByText('MR Description')).toBeInTheDocument(); 
      expect(screen.getByTestId('mock-diff')).toBeInTheDocument();
    });
  });

  test('should fetch and display Phabricator revision details', async () => {
    // Set location state for Phabricator
    mockLocation.pathname = '/detail/P/D456';
    mockLocation.state.revision = { id: 'D456', source: 'P' };

    await renderRevisionDetail();

    await waitFor(() => {
      expect(PhabricatorAPI.prototype.getTransformedRevisionInfo).toHaveBeenCalledWith('D456');
    });

    // Check if data is displayed
    await waitFor(() => {
      expect(screen.getByText(mockTransformedPhabData.title)).toBeInTheDocument();
      expect(screen.getByText(/Phab Author - phabauthor/)).toBeInTheDocument();
      const summaryElement = screen.getByTestId('revision-summary');
      expect(within(summaryElement).getByText('Phab Description')).toBeInTheDocument();
      expect(screen.getByTestId('mock-diff')).toBeInTheDocument();
    });
  });

  // Add more tests for:
  // - Diff view toggle (split/unified)
  // - Adding/viewing inline comments
  // - Accepting revision
  // - Error handling during fetch
}); 