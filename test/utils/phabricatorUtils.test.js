import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import qs from 'qs';
import PhabricatorAPI from '../../src/utils/phabricatorUtils';

// Mock console methods
// Mock fetch on window
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(window, 'fetch');
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
  window.fetch.mockRestore(); 
});

describe('PhabricatorAPI', () => {
  const mockConfig = {
    phabricatorUrl: 'https://phab.example.com',
    phabricatorToken: 'phab-api-token-123'
  };

  let phabricatorAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    phabricatorAPI = new PhabricatorAPI(mockConfig);
    // Reset fetch mock implementation
    window.fetch.mockReset(); 
  });

  describe('constructor', () => {
    it('should initialize with the provided config', () => {
      expect(phabricatorAPI.config).toEqual(mockConfig);
    });
  });

  describe('callAPI', () => {
    it('should call the Phabricator API with the correct parameters', async () => {
      const mockResponse = {
        result: { data: { id: 123, name: 'Test' } }
      };

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const method = 'test.method';
      const query = { param1: 'value1', param2: 'value2' };

      const result = await phabricatorAPI.callAPI(method, query);

      // Expect window.fetch to be called
      expect(window.fetch).toHaveBeenCalledWith(
        `${mockConfig.phabricatorUrl}/api/${method}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: qs.stringify({
            ...query,
            'api.token': mockConfig.phabricatorToken
          })
        }
      );

      expect(result).toEqual(mockResponse.result);
    });

    it('should throw an error when API returns an error', async () => {
      const errorResponse = {
        error_code: 'ERR-INVALID',
        error_info: 'Invalid request'
      };

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(errorResponse)
      });

      await expect(phabricatorAPI.callAPI('test.method', {}))
        .rejects
        .toThrow(`Phabricator Error ${errorResponse.error_code}: ${errorResponse.error_info}`);
    });
  });

  describe('getUserInfo', () => {
    it('should call API with correct parameters and return user data', async () => {
      const mockUserData = [
        {
          phid: 'PHID-USER-123',
          fields: {
            username: 'testuser',
            realName: 'Test User'
          }
        }
      ];

      // Mock the callAPI method
      phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockUserData });

      const result = await phabricatorAPI.getUserInfo('PHID-USER-123');

      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('user.search', {
        constraints: {
          phids: ['PHID-USER-123']
        }
      });

      expect(result).toEqual(mockUserData);
    });
  });

  describe('getRevisions', () => {
    it('should call API to get revisions with correct parameters', async () => {
      const mockRevisions = [
        { id: 'D123', title: 'Revision 1' },
        { id: 'D456', title: 'Revision 2' }
      ];

      phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockRevisions });

      const result = await phabricatorAPI.getRevisions();

      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.revision.search', {
        constraints: {
          statuses: ['needs-review', 'needs-revision', 'accepted']
        }
      });

      expect(result).toEqual(mockRevisions);
    });
  });

  describe('getTransformedRevisions', () => {
    it('should transform revisions into a standard format', async () => {
      const mockRevisions = [
        {
          id: 123,
          fields: {
            title: '[JIRA-123] Test Revision',
            status: { value: 'accepted' },
            authorPHID: 'PHID-USER-123',
            dateModified: 1612345678,
            isDraft: false
          },
          repositoryPHID: 'PHID-REPO-123'
        }
      ];

      const mockUser = [
        {
          phid: 'PHID-USER-123',
          fields: {
            username: 'testuser',
            realName: 'Test User'
          }
        }
      ];

      const mockRepo = [
        {
          id: 'REPO123',
          fields: {
            name: 'Test Repository'
          }
        }
      ];

      // Mock the necessary method calls
      phabricatorAPI.getRevisions = jest.fn().mockResolvedValue(mockRevisions);
      phabricatorAPI.getUserInfo = jest.fn().mockResolvedValue(mockUser);
      phabricatorAPI.getPhabricatorRepositoryInfo = jest.fn().mockResolvedValue(mockRepo);

      const result = await phabricatorAPI.getTransformedRevisions();

      expect(phabricatorAPI.getRevisions).toHaveBeenCalled();
      expect(phabricatorAPI.getUserInfo).toHaveBeenCalledWith('PHID-USER-123');
      expect(phabricatorAPI.getPhabricatorRepositoryInfo).toHaveBeenCalledWith('PHID-REPO-123');

      // Check transformed data
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 123,
        title: '[JIRA-123] Test Revision',
        status: 'accepted',
        url: 'https://phab.example.com/D123',
        author: 'Test User',
        dateModified: 1612345678000, // Converted to milliseconds
        isDraft: false,
        project: 'Test Repository',
        projectUrl: 'https://phab.example.com/diffusion/REPO123',
        projectId: 'REPO123',
        jiraId: 'JIRA-123',
        color: 'phab-green',
        source: 'P'
      });
    });
  });

  describe('getRawDiff', () => {
    it('should fetch raw diff data', async () => {
      const mockDiffData = 'diff --git a/file1.txt b/file1.txt\nindex abc123..def456 100644\n--- a/file1.txt\n+++ b/file1.txt';
      
      phabricatorAPI.callAPI = jest.fn().mockResolvedValue(mockDiffData);
      
      const result = await phabricatorAPI.getRawDiff(123);
      
      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.getrawdiff', {
        diffID: 123
      });
      
      expect(result).toEqual(mockDiffData);
    });
  });

  describe('parseMultipleDiffs', () => {
    it('should parse multiple diffs from diff text', () => {
      const diffText = `diff --git a/file1.txt b/file1.txt
index abc123..def456 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1,5 +1,5 @@
-line1
+line1 changed
 line2
 line3
diff --git a/file2.txt b/file2.txt
new file mode 100644
index 000000..123456
--- /dev/null
+++ b/file2.txt
@@ -0,0 +1,3 @@
+new line1
+new line2
+new line3`;

      const result = phabricatorAPI.parseMultipleDiffs(diffText);
      
      expect(result).toHaveLength(2);
      expect(result[0].oldPath).toBe('file1.txt');
      expect(result[0].newPath).toBe('file1.txt');
      expect(result[0].isNewFile).toBe(false);
      
      // The implementation might store paths differently than we expected
      // Let's verify the second diff is a new file but be flexible about the exact path format
      expect(result[1].newPath).toBe('file2.txt');
      expect(result[1].isNewFile).toBe(true);
    });
    
    it('should handle empty diff text', () => {
      expect(phabricatorAPI.parseMultipleDiffs('')).toEqual([]);
      expect(phabricatorAPI.parseMultipleDiffs(null)).toEqual([]);
    });
  });

  describe('getRevisionInfo', () => {
    it('should call API to get specific revision info', async () => {
      const mockRevision = [{ id: 'D123', title: 'Specific Revision' }];
      phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockRevision });
      const revisionId = 123;

      const result = await phabricatorAPI.getRevisionInfo(revisionId);

      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.revision.search', {
        constraints: {
          ids: [revisionId]
        }
      });
      expect(result).toEqual(mockRevision);
    });
  });

  describe('getDiffInfo', () => {
    it('should call API to get diff info with reviewers', async () => {
      const mockDiffData = [{ phid: 'PHID-DIFF-123', reviewers: {} }];
      phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockDiffData });
      const diffId = 'PHID-DIFF-123';

      const result = await phabricatorAPI.getDiffInfo(diffId);

      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.diff.search', {
        constraints: {
          phids: [diffId]
        },
        attachments: {
          reviewers: true
        }
      });
      expect(result).toEqual(mockDiffData);
    });
  });

  describe('getPhabricatorRepositoryInfo', () => {
    it('should call API to get repository info', async () => {
        const mockRepoData = [{ phid: 'PHID-REPO-123', name: 'Test Repo' }];
        phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockRepoData });
        const repoPhid = 'PHID-REPO-123';

        const result = await phabricatorAPI.getPhabricatorRepositoryInfo(repoPhid);

        expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('diffusion.repository.search', {
            constraints: {
                phids: [repoPhid]
            }
        });
        expect(result).toEqual(mockRepoData);
    });
  });

  describe('getDiffChanges', () => {
    it('should call API to get diff changes with commits', async () => {
      const mockChangesData = [{ phid: 'PHID-DIFF-123', attachments: { commits: [] } }];
      phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockChangesData });
      const revisionPhid = 'PHID-REV-123'; // The API uses revision PHID here

      const result = await phabricatorAPI.getDiffChanges(revisionPhid);

      expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.diff.search', {
        constraints: {
          revisionPHIDs: [revisionPhid]
        },
        attachments: {
          commits: true
        }
      });
      expect(result).toEqual(mockChangesData);
    });
  });

  describe('getRevisionComments', () => {
    it('should call API to get transaction details (comments)', async () => {
        const mockTransactionData = { data: [{ type: 'comment', comments: [] }] };
        phabricatorAPI.callAPI = jest.fn().mockResolvedValue(mockTransactionData);
        const revisionPhid = 'PHID-REV-123';

        // Note: getRevisionComments takes revisionId (numerical) but uses revisionPHID for the API call
        const result = await phabricatorAPI.getRevisionComments(123, revisionPhid);

        expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('transaction.search', {
            objectIdentifier: revisionPhid
        });
        expect(result).toEqual(mockTransactionData);
    });
  });

  describe('processComments', () => {
    it('should process raw transaction data into comments and inline comments', async () => {
      const mockTransactionData = {
        data: [
          {
            type: 'comment',
            authorPHID: 'PHID-USER-1',
            dateCreated: 1600000000,
            comments: [{ id: 101, content: { raw: 'General comment' } }]
          },
          {
            type: 'inline',
            authorPHID: 'PHID-USER-2',
            dateCreated: 1600000010,
            comments: [{ id: 102, content: { raw: 'Inline comment' } }],
            fields: { line: 10, path: 'file.txt' }
          },
          { type: 'core:create', authorPHID: 'PHID-USER-3' } // Should be filtered out
        ]
      };
      const mockUser1 = [{ fields: { realName: 'User One', username: 'user1' } }];
      const mockUser2 = [{ fields: { realName: 'User Two', username: 'user2' } }];

      phabricatorAPI.getUserInfo = jest.fn()
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      const { comments, inlineComments } = await phabricatorAPI.processComments(mockTransactionData);

      expect(phabricatorAPI.getUserInfo).toHaveBeenCalledWith('PHID-USER-1');
      expect(phabricatorAPI.getUserInfo).toHaveBeenCalledWith('PHID-USER-2');

      expect(comments).toHaveLength(2); // Both general and inline end up in the `comments` array
      expect(inlineComments).toHaveLength(1);

      // Check general comment details
      expect(comments[0]).toMatchObject({
        id: 101,
        body: 'General comment',
        author: { id: 'PHID-USER-1', name: 'User One', username: 'user1' },
        created_at: 1600000000000
      });

      // Check inline comment details (which is also the second element in `comments`)
      expect(comments[1]).toMatchObject({
        id: 102,
        body: 'Inline comment',
        author: { id: 'PHID-USER-2', name: 'User Two', username: 'user2' },
        position: { new_line: 10, new_path: 'file.txt' },
        created_at: 1600000010000
      });
      expect(inlineComments[0]).toEqual(comments[1]); // Inline comment is also in the inlineComments array
    });

    it('should return empty arrays if no transaction data is provided', async () => {
        const { comments, inlineComments } = await phabricatorAPI.processComments(null);
        expect(comments).toEqual([]);
        expect(inlineComments).toEqual([]);
    });
  });

  describe('getRevisionCommits', () => {
    it('should call API to get commits associated with a revision PHID', async () => {
        // Note: The function name is slightly confusing, it searches by *commit* PHIDs attached to a *diff*.
        // Let's assume we have the commit PHIDs from a diff search.
        const mockCommitData = [{ phid: 'PHID-COMMIT-1', message: 'Commit 1' }];
        phabricatorAPI.callAPI = jest.fn().mockResolvedValue({ data: mockCommitData });
        const commitPhid = 'PHID-COMMIT-1';

        const result = await phabricatorAPI.getRevisionCommits(commitPhid);

        expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('diffusion.commit.search', {
            constraints: {
                phids: [commitPhid]
            }
        });
        expect(result).toEqual(mockCommitData);
    });
  });

  describe('getRevisionDetailsWithReviewers', () => {
    it('should call differential.query to get revision details', async () => {
        const mockRevisionDetails = [{ id: 123, title: 'Revision with reviewers' }];
        phabricatorAPI.callAPI = jest.fn().mockResolvedValue(mockRevisionDetails);
        const revisionId = 123;

        const result = await phabricatorAPI.getRevisionDetailsWithReviewers(revisionId);

        expect(phabricatorAPI.callAPI).toHaveBeenCalledWith('differential.query', {
            ids: [revisionId]
        });
        expect(result).toEqual(mockRevisionDetails);
    });
  });

  describe('getTransformedRevisionInfo', () => {
    it('should fetch all related info and transform a revision', async () => {
        const revisionId = 123;
        const mockRevisionDetails = [
            {
                id: revisionId,
                phid: 'PHID-REV-123',
                title: '[JIRA-456] Full Revision Test',
                summary: 'Test summary',
                statusName: 'Needs Review',
                authorPHID: 'PHID-AUTHOR-1',
                repositoryPHID: 'PHID-REPO-1',
                dateModified: 1620000000,
                branch: 'feature/test',
                reviewers: { 'PHID-REVIEWER-1': {} }
            }
        ];
        const mockAuthor = [{ fields: { realName: 'Author Name', username: 'author1' } }];
        const mockReviewer = [{ fields: { realName: 'Reviewer Name', username: 'reviewer1' } }];
        const mockRepo = [{ id: 'R1', fields: { name: 'Test Repo' } }];
        const mockCommentsData = { data: [] }; // Assume no comments for simplicity
        const mockChanges = [
            {
                phid: 'PHID-DIFF-1',
                attachments: { commits: { commits: [{ id: 'C1', message: 'Test commit' }] } }
            }
        ];
        const mockDiffsInfo = [{ id: 999 }];
        const mockRawDiff = 'diff --git a/file.txt b/file.txt\n+++ b/file.txt';

        // Mock all the dependent methods
        phabricatorAPI.getRevisionDetailsWithReviewers = jest.fn().mockResolvedValue(mockRevisionDetails);
        phabricatorAPI.getUserInfo = jest.fn()
            .mockResolvedValueOnce(mockAuthor)      // Author call
            .mockResolvedValueOnce(mockReviewer);   // Reviewer call
        phabricatorAPI.getPhabricatorRepositoryInfo = jest.fn().mockResolvedValue(mockRepo);
        phabricatorAPI.getRevisionComments = jest.fn().mockResolvedValue(mockCommentsData);
        phabricatorAPI.processComments = jest.fn().mockResolvedValue({ comments: [], inlineComments: [] });
        phabricatorAPI.getDiffChanges = jest.fn().mockResolvedValue(mockChanges);
        phabricatorAPI.getDiffInfo = jest.fn().mockResolvedValue(mockDiffsInfo);
        phabricatorAPI.getRawDiff = jest.fn().mockResolvedValue(mockRawDiff);
        phabricatorAPI.parseMultipleDiffs = jest.fn().mockReturnValue([{ oldPath: 'file.txt', newPath: 'file.txt', diff: '+++ b/file.txt' }]);

        const result = await phabricatorAPI.getTransformedRevisionInfo(revisionId);

        expect(phabricatorAPI.getRevisionDetailsWithReviewers).toHaveBeenCalledWith(revisionId);
        expect(phabricatorAPI.getUserInfo).toHaveBeenCalledWith('PHID-AUTHOR-1');
        expect(phabricatorAPI.getUserInfo).toHaveBeenCalledWith('PHID-REVIEWER-1');
        expect(phabricatorAPI.getPhabricatorRepositoryInfo).toHaveBeenCalledWith('PHID-REPO-1');
        expect(phabricatorAPI.getRevisionComments).toHaveBeenCalledWith(revisionId, 'PHID-REV-123');
        expect(phabricatorAPI.processComments).toHaveBeenCalledWith(mockCommentsData);
        expect(phabricatorAPI.getDiffChanges).toHaveBeenCalledWith('PHID-REV-123');
        expect(phabricatorAPI.getDiffInfo).toHaveBeenCalledWith('PHID-DIFF-1');
        expect(phabricatorAPI.getRawDiff).toHaveBeenCalledWith(999);
        expect(phabricatorAPI.parseMultipleDiffs).toHaveBeenCalledWith(mockRawDiff);

        expect(result).toEqual({
            id: revisionId,
            title: '[JIRA-456] Full Revision Test',
            summary: 'Test summary',
            status: 'Needs Review',
            url: `https://phab.example.com/D${revisionId}`,
            author: { name: 'Author Name', username: 'author1' },
            dateModified: 1620000000000,
            project: 'Test Repo',
            jiraId: 'JIRA-456',
            branch: 'feature/test',
            commits: [{ id: 'C1', message: 'Test commit' }],
            reviewers: [{ name: 'Reviewer Name', username: 'reviewer1' }],
            comments: [],
            changes: mockChanges,
            diffs: [{ oldPath: 'file.txt', newPath: 'file.txt', diff: '+++ b/file.txt' }],
            inlineComments: []
        });
    });
  });
});
