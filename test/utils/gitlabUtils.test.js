import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dayjs from 'dayjs';

// Use standard import
import * as gitlabUtils from '../../src/utils/gitlabUtils';

// Mock localStorage (remains the same)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock global location (remains the same)
delete window.location;
window.location = { href: '' };

describe('gitlabUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks(); 
    // Reset localStorage state
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear(); 
    // Reset global fetch/console mocks 
    window.fetch = jest.fn(); 
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore mocks created with jest.spyOn
    jest.restoreAllMocks();
  });

  describe('isGitlabTokenValid', () => {
    it('should return false when no token exists in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(gitlabUtils.isGitlabTokenValid()).toBe(false);
    });

    it('should return false when token has invalid structure', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ invalid: 'structure' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      expect(gitlabUtils.isGitlabTokenValid()).toBe(false);
    });

    it('should return false when token is expired', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ 
          token: 'valid-token', 
          expires: dayjs().subtract(1, 'day').toISOString() 
        });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      expect(gitlabUtils.isGitlabTokenValid()).toBe(false);
    });

    it('should return true when token is valid and not expired', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ 
          token: 'valid-token', 
          expires: dayjs().add(1, 'day').toISOString() 
        });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      expect(gitlabUtils.isGitlabTokenValid()).toBe(true);
    });
  });

  describe('gitlabConnect', () => {
    it('should redirect to the correct GitLab OAuth URL', () => {
      const gitlabUrl = 'http://gitlab.example.com';
      const gitlabAppId = 'app-id-123';
      const gitlabRedirectUri = 'http://localhost:3000/callback';
      
      gitlabUtils.gitlabConnect(gitlabUrl, gitlabAppId, gitlabRedirectUri);
      
      expect(window.location.href).toBe(
        `${gitlabUrl}/oauth/authorize?client_id=${gitlabAppId}&redirect_uri=${gitlabRedirectUri}&response_type=code&scope=api`
      );
    });
  });

  describe('gitlabCallback', () => {
    it('should fetch the access token and store it in localStorage', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        expires_in: 7200
      };
      
      // Use window.fetch for mocking resolution
      window.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse)
      });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      const code = 'auth-code';
      const gitlabSecret = 'secret';
      const gitlabAppId = 'app-id';
      const gitlabRedirectUri = 'http://localhost:3000/callback';

      const result = await gitlabUtils.gitlabCallback(
        code,
        gitlabSecret,
        gitlabAppId,
        gitlabRedirectUri
      );

      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );

      expect(result).toBe('new-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitlabToken',
        expect.stringContaining('new-access-token')
      );
    });

    it('should throw an error when token request fails', async () => {
      // Use window.fetch for mocking resolution
      window.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ error: 'invalid_grant' })
      });

      localStorageMock.getItem.mockReturnValue('http://gitlab.example.com');

      await expect(
        gitlabUtils.gitlabCallback('code', 'secret', 'app-id', 'redirect-uri')
      ).rejects.toThrow('Failed to obtain access token');
    });
  });

  describe('getMyGitlabUser', () => {
    it('should fetch and store the user in localStorage', async () => {
      const mockUser = { id: 1, name: 'Test User', username: 'testuser' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      // Mock the internal getGitlabToken function since we can't access it directly
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        return originalGetItem.call(localStorage, key);
      });

      // Use window.fetch for mocking resolution
      window.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await gitlabUtils.getMyGitlabUser();

      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token'
          })
        })
      );

      expect(result).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gitlabUser',
        JSON.stringify(mockUser)
      );
      
      // Restore original implementation
      localStorage.getItem = originalGetItem;
    });

    it('should handle errors and return empty object', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      // Mock the internal getGitlabToken function since we can't access it directly
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        return originalGetItem.call(localStorage, key);
      });

      // Use window.fetch for mocking rejection
      window.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await gitlabUtils.getMyGitlabUser();
      expect(result).toEqual({});
      
      // Restore original implementation
      localStorage.getItem = originalGetItem;
    });
  });

  describe('getProjectsByIds', () => {
    it('should fetch projects by their IDs', async () => {
      const mockProjects = [
        { id: 123, name: 'Project 1' },
        { id: 456, name: 'Project 2' }
      ];
      
      // Mock the internal getGitlabToken function since we can't access it directly
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return originalGetItem.call(localStorage, key);
      });

      // Mock fetch for each project ID using window.fetch
      window.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProjects[0])
      });
      
      window.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProjects[1])
      });

      const result = await gitlabUtils.getProjectsByIds('123, 456');

      expect(window.fetch).toHaveBeenCalledTimes(2);
      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects/123',
        expect.any(Object)
      );
      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects/456',
        expect.any(Object)
      );

      expect(result).toEqual(mockProjects);
      
      // Restore original implementation
      localStorage.getItem = originalGetItem;
    });

    it('should handle errors during fetch', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(gitlabUtils.getProjectsByIds('123')).rejects.toThrow('API Error');
    });
  });

  describe('getGitlabProjects', () => {
    it('should fetch all projects with correct permissions and handle pagination', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUser') return JSON.stringify({ id: 1 });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      const mockProjectsPage1 = [
        { id: 1, name: 'Project 1', permissions: { project_access: { access_level: 40 } } }, // maintainer
        { id: 2, name: 'Project 2', permissions: { project_access: { access_level: 30 } } }, // developer
      ];
      const mockProjectsPage2 = [
        { id: 3, name: 'Project 3', permissions: { project_access: { access_level: 50 } } }, // owner
        { id: 4, name: 'Project 4', permissions: { project_access: { access_level: 20 } } }, // guest (should be filtered out)
      ];

      // Use window.fetch for mocking
      window.fetch
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockProjectsPage1) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockProjectsPage2) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([]) }); // End pagination

      const result = await gitlabUtils.getGitlabProjects();

      expect(window.fetch).toHaveBeenCalledTimes(3);
      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects?membership=true&per_page=100&page=1',
        expect.any(Object)
      );
      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects?membership=true&per_page=100&page=2',
        expect.any(Object)
      );
      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects?membership=true&per_page=100&page=3',
        expect.any(Object)
      );

      expect(result).toHaveLength(3);
      expect(result).toEqual([mockProjectsPage1[0], mockProjectsPage1[1], mockProjectsPage2[0]]);
    });

    it('should return empty array on fetch error', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUser') return JSON.stringify({ id: 1 });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      // Use window.fetch for mocking rejection
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getGitlabProjects();
      expect(result).toEqual([]);
    });
  });

  describe('getStarredGitlabProjects', () => {
    it('should fetch starred projects', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      const mockStarredProjects = [
        { id: 10, name: 'Starred Project 1' },
        { id: 20, name: 'Starred Project 2' }
      ];

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockStarredProjects) });

      const result = await gitlabUtils.getStarredGitlabProjects();

      expect(window.fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects?starred=true&per_page=100',
        expect.any(Object)
      );
      expect(result).toEqual(mockStarredProjects);
    });

    it('should return empty array on fetch error', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      // Use window.fetch for mocking rejection
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getStarredGitlabProjects();
      expect(result).toEqual([]);
    });
  });

  describe('getUnmergedGitlabMergeRequests', () => {
    it('should fetch opened merge requests for a project', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      const mockMRs = [
        { id: 1, iid: 101, title: 'MR 1' },
        { id: 2, iid: 102, title: 'MR 2' }
      ];
      const projectId = 123;

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockMRs) });

      const result = await gitlabUtils.getUnmergedGitlabMergeRequests(projectId);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests?state=opened`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer valid-token' })
        })
      );
      expect(result).toEqual(mockMRs);
    });

    it('should return empty array on fetch error', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      // Use window.fetch for mocking rejection
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getUnmergedGitlabMergeRequests(123);
      expect(result).toEqual([]);
    });
  });

  describe('getGitlabMRsFromAllProjects', () => {
    it.skip('should fetch MRs from all projects listed in localStorage', async () => {
      const mockProjects = [
        { id: 1, name: 'Project A', path_with_namespace: 'group/project-a', web_url: 'url-a' },
        { id: 2, name: 'Project B', path_with_namespace: 'group/project-b', web_url: 'url-b' }
      ];
      const mockMRs1 = [{ id: 101, iid: 1, title: 'MR A1' }];
      const mockMRs2 = [{ id: 102, iid: 2, title: 'MR B1' }, { id: 103, iid: 3, title: 'MR B2' }];

      // Mock safeJSONParse
      jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue(mockProjects);

      // Mock the getUnmergedGitlabMergeRequests function
      const getUnmergedMock = jest.spyOn(gitlabUtils, 'getUnmergedGitlabMergeRequests')
        .mockResolvedValueOnce(mockMRs1)
        .mockResolvedValueOnce(mockMRs2);

      // Call the function under test
      const result = await gitlabUtils.getGitlabMRsFromAllProjects();

      // Assertions
      expect(getUnmergedMock).toHaveBeenCalledTimes(2);
      expect(getUnmergedMock).toHaveBeenCalledWith(1);
      expect(getUnmergedMock).toHaveBeenCalledWith(2);
      
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no projects in storage', async () => {
      jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue(null);
      
      const getUnmergedMock = jest.spyOn(gitlabUtils, 'getUnmergedGitlabMergeRequests');
      
      const result = await gitlabUtils.getGitlabMRsFromAllProjects();
      expect(result).toEqual([]);
      // Assert spy was not called
      expect(getUnmergedMock).not.toHaveBeenCalled();
    });
  });

  describe('getGitlabMRbyId', () => {
    const projectId = 123;
    const mrIid = 456;
    const mockMR = { id: 1, iid: mrIid, title: 'Specific MR' };

    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
    });

    it('should fetch a specific merge request by ID', async () => {
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockMR) });

      const result = await gitlabUtils.getGitlabMRbyId(mrIid, projectId);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}`,
        expect.any(Object)
      );
      expect(result).toEqual(mockMR);
    });

    it('should return empty object on fetch error', async () => {
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getGitlabMRbyId(mrIid, projectId);
      expect(result).toEqual({});
    });

    it('should return empty object if response is not ok', async () => {
       window.fetch.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });

      const result = await gitlabUtils.getGitlabMRbyId(mrIid, projectId);
      expect(result).toEqual({});
    });
  });

  describe('getMRComments', () => {
    it('should fetch comments for a merge request', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      const mockComments = [
        { id: 1, body: 'Comment 1' },
        { id: 2, body: 'Comment 2' }
      ];

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockComments) });

      const result = await gitlabUtils.getMRComments(projectId, mrIid);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
        expect.any(Object)
      );
      expect(result).toEqual(mockComments);
    });

    it('should return empty array on fetch error', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getMRComments(projectId, mrIid);
      expect(result).toEqual([]);
    });
  });

  describe('getMRCommits', () => {
    it('should fetch and transform commits for a merge request', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      const mockCommits = [
        { id: 'abc', message: 'Commit 1', author_name: 'Author 1', author_email: 'a1@example.com', authored_date: '2023-01-01T10:00:00Z' },
        { id: 'def', message: 'Commit 2', author_name: 'Author 2', author_email: 'a2@example.com', authored_date: '2023-01-01T11:00:00Z' }
      ];
      const expectedTransformedCommits = [
        { id: 'abc', message: 'Commit 1', author: { name: 'Author 1', email: 'a1@example.com', epoch: 1672567200 } },
        { id: 'def', message: 'Commit 2', author: { name: 'Author 2', email: 'a2@example.com', epoch: 1672570800 } }
      ];

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockCommits) });

      const result = await gitlabUtils.getMRCommits(projectId, mrIid);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/commits`,
        expect.any(Object)
      );
      expect(result).toEqual(expectedTransformedCommits);
    });

    it('should return empty array on fetch error', async () => {
       localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getMRCommits(projectId, mrIid);
      expect(result).toEqual([]);
    });
  });

  describe('addGitlabComment', () => {
    it('should successfully add a comment', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      const commentBody = 'This is a test comment';
      const mockResponse = { id: 12345, body: commentBody };

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockResponse) });

      const result = await gitlabUtils.addGitlabComment(projectId, mrIid, commentBody);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: commentBody }),
          headers: expect.objectContaining({ Authorization: 'Bearer valid-token' })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if required parameters are missing', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      await expect(gitlabUtils.addGitlabComment(123, 456, null)).rejects.toThrow('Missing required parameters');
    });

    it('should throw error on API failure', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });
      const projectId = 123;
      const mrIid = 456;
      const commentBody = 'Test comment';
      const errorResponse = { message: 'Invalid parameter' };

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ 
        ok: false, 
        statusText: 'Bad Request', 
        json: jest.fn().mockResolvedValue(errorResponse) 
      });

      await expect(gitlabUtils.addGitlabComment(projectId, mrIid, commentBody)).rejects.toThrow('Error adding comment: Bad Request - Invalid parameter');
    });
  });

  describe('addGitlabInlineComment', () => {
    const position = {
        base_sha: 'abc',
        start_sha: 'def',
        head_sha: 'ghi',
        new_path: 'src/file.js',
        position_type: 'text',
        new_line: 10
    };
    const projectId = 123;
    const mrIid = 456;
    const commentBody = 'Inline comment';

    beforeEach(() => {
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
            if (key === 'gitlabUrl') return 'http://gitlab.example.com';
            return null;
        });
    });

    it('should successfully add an inline comment', async () => {
      const mockResponse = { id: 1, notes: [{ id: 10, body: commentBody }] }; // Discussion with the new note

      // Use window.fetch for mocking
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockResponse) });

      const result = await gitlabUtils.addGitlabInlineComment(projectId, mrIid, commentBody, position);

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: commentBody, position }),
          headers: expect.objectContaining({ Authorization: 'Bearer valid-token' })
        })
      );
      expect(result).toEqual(mockResponse.notes[0]); // Should return the note itself
    });

    it('should throw error if required parameters are missing', async () => {
        await expect(gitlabUtils.addGitlabInlineComment(null, mrIid, commentBody, position)).rejects.toThrow('Missing required parameters');
        await expect(gitlabUtils.addGitlabInlineComment(projectId, mrIid, commentBody, null)).rejects.toThrow('Missing required parameters');
    });

    it('should throw error if position object is missing required fields', async () => {
        const incompletePosition = { ...position, new_path: undefined };
        await expect(gitlabUtils.addGitlabInlineComment(projectId, mrIid, commentBody, incompletePosition)).rejects.toThrow('Missing required fields in position');
        const noLinePosition = { ...position, new_line: undefined, old_line: null }; // Missing both new_line and old_line
        await expect(gitlabUtils.addGitlabInlineComment(projectId, mrIid, commentBody, noLinePosition)).rejects.toThrow('Position object must contain either old_line or new_line');
    });

    it('should throw error on API failure', async () => {
        const errorResponse = { message: { 'position.new_line': ['is not a number'] } };
        // Use window.fetch for mocking
        window.fetch.mockResolvedValueOnce({ 
            ok: false, 
            statusText: 'Unprocessable Entity', 
            json: jest.fn().mockResolvedValue(errorResponse) 
        });

        await expect(gitlabUtils.addGitlabInlineComment(projectId, mrIid, commentBody, position)).rejects.toThrow('Error adding inline comment: Unprocessable Entity - {"position.new_line":["is not a number"]}');
    });
  });

  describe('deleteGitlabComment', () => {
    const projectId = 123;
    const mrIid = 456;
    const noteId = 789;

    beforeEach(() => {
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
            if (key === 'gitlabUrl') return 'http://gitlab.example.com';
            return null;
        });
    });

    it('should successfully delete a comment', async () => {
        // Use window.fetch for mocking
        window.fetch.mockResolvedValueOnce({ ok: true, status: 204 }); // 204 No Content on successful DELETE

        const result = await gitlabUtils.deleteGitlabComment(projectId, mrIid, noteId);

        expect(window.fetch).toHaveBeenCalledWith(
            `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes/${noteId}`,
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({ Authorization: 'Bearer valid-token' })
            })
        );
        expect(result).toBe(true);
    });

    it('should throw error if required parameters are missing', async () => {
        await expect(gitlabUtils.deleteGitlabComment(projectId, mrIid, null)).rejects.toThrow('Missing required parameters');
    });

    it('should throw error on API failure (e.g., 404 Not Found)', async () => {
        const errorResponse = { message: 'Note not found' };
        // Use window.fetch for mocking
        window.fetch.mockResolvedValueOnce({ 
            ok: false, 
            status: 404,
            statusText: 'Not Found', 
            json: jest.fn().mockResolvedValue(errorResponse) 
        });

        await expect(gitlabUtils.deleteGitlabComment(projectId, mrIid, noteId)).rejects.toThrow('Error deleting comment: Not Found - "Note not found"');
    });

    it('should throw error on general error during delete', async () => {
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
            if (key === 'gitlabUrl') return 'http://gitlab.example.com';
            return null;
        });
        const projectId = 123;
        const mrIid = 456;
        const noteId = 789;
        window.fetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(gitlabUtils.deleteGitlabComment(projectId, mrIid, noteId)).rejects.toThrow('Network error');
    });
  });

  describe('getTransformedGitlabMRs', () => {
    const mockMRsRaw = [
      {
        iid: 101,
        title: '[JIRA-1] MR 1',
        detailed_merge_status: 'mergeable',
        web_url: 'url-mr1',
        author: { id: 1, name: 'User A' },
        updated_at: '2023-10-26T10:00:00Z',
        work_in_progress: false,
        name: 'Project Alpha', // Added by getGitlabMRsFromAllProjects
        project_url: 'url-alpha',
        project_id: 1
      },
      {
        iid: 102,
        title: '[JIRA-2] Draft MR 2',
        detailed_merge_status: 'draft_status',
        web_url: 'url-mr2',
        author: { id: 2, name: 'User B' },
        updated_at: '2023-10-26T11:00:00Z',
        work_in_progress: true,
        name: 'Project Beta',
        project_url: 'url-beta',
        project_id: 2
      }
    ];
    const mockFollowedUsers = [{ id: 2, name: 'User B' }];

    it.skip('should transform merge requests correctly', async () => {
      // Spy on dependencies and mock implementation
      const getMRsMock = jest.spyOn(gitlabUtils, 'getGitlabMRsFromAllProjects')
        .mockResolvedValue(mockMRsRaw);
      
      jest.spyOn(gitlabUtils, 'safeJSONParse').mockImplementation(key => {
        if (key === 'followedUsers') return mockFollowedUsers;
        return null;
      });

      const result = await gitlabUtils.getTransformedGitlabMRs();

      expect(getMRsMock).toHaveBeenCalled();
      expect(result).toHaveLength(mockMRsRaw.length);

      // Check first MR transformation
      expect(result[0]).toMatchObject({
        id: 101,
        title: '[JIRA-1] MR 1',
        status: 'mergeable',
        url: 'url-mr1',
        author: 'User A',
        dateModified: '2023-10-26T10:00:00Z',
        isDraft: false,
        project: 'Project Alpha',
        projectUrl: 'url-alpha',
        projectId: 1,
        iid: 101,
        color: 'git-green',
        jiraId: 'JIRA-1',
        following: false,
        source: 'G'
      });
      expect(typeof result[0].rowClick).toBe('function');
    });

    it.skip('should call getGitlabMRbyId when rowClick is invoked', async () => {
      // Spy on dependencies and mock implementation
      jest.spyOn(gitlabUtils, 'getGitlabMRsFromAllProjects')
        .mockResolvedValue(mockMRsRaw);
      
      const getByIdMock = jest.spyOn(gitlabUtils, 'getGitlabMRbyId')
        .mockResolvedValue({ id: 101 });
      
      jest.spyOn(gitlabUtils, 'safeJSONParse').mockImplementation(key => {
        if (key === 'followedUsers') return mockFollowedUsers;
        return null;
      });

      // Mock localStorage.getItem for getGitlabToken which is used in rowClick
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        return null;
      });

      const transformedMRs = await gitlabUtils.getTransformedGitlabMRs();
      expect(transformedMRs.length).toBeGreaterThan(0);
      
      // Ensure rowClick exists before calling
      expect(typeof transformedMRs[0].rowClick).toBe('function');
      await transformedMRs[0].rowClick(); // Simulate clicking the first row

      // Assert call on the mocked function
      expect(getByIdMock).toHaveBeenCalledWith(mockMRsRaw[0].iid, mockMRsRaw[0].project_id);
    });
  });

  describe('getFollowedUsers', () => {
    const mockUsers = [{ id: 1, name: 'Followed User' }];
    const userId = 99;

    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
        if (key === 'gitlabUrl') return 'http://gitlab.example.com';
        if (key === 'gitlabUser') return JSON.stringify({ id: userId });
        return null;
      });
    });

    it('should fetch followed users and store them', async () => {
      window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockUsers) });

      const result = await gitlabUtils.getFollowedUsers();

      expect(window.fetch).toHaveBeenCalledWith(
        `http://gitlab.example.com/api/v4/users/${userId}/following`,
        expect.any(Object)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith('followedUsers', JSON.stringify(mockUsers));
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array on fetch error', async () => {
      window.fetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await gitlabUtils.getFollowedUsers();
      expect(result).toEqual([]);
    });

     it('should return empty array if response is not ok', async () => {
      window.fetch.mockResolvedValueOnce({ ok: false, statusText: 'Forbidden' });

      const result = await gitlabUtils.getFollowedUsers();
      expect(result).toEqual([]);
    });
  });

  describe('getTransformedMRInfo', () => {
    const mockRevision = {
      iid: 101,
      project_id: 1,
      title: '[JIRA-1] Test MR',
      description: 'MR Description',
      detailed_merge_status: 'mergeable',
      web_url: 'mr-url',
      author: { name: 'Author Name', username: 'author_user' },
      updated_at: '2023-10-27T10:00:00Z',
      source_branch: 'feature-branch',
      reviewers: [{ id: 2, name: 'Reviewer 1' }],
      pipeline: { status: 'success' },
      diff_refs: { base_sha: 'base', head_sha: 'head', start_sha: 'start' }
    };
    const mockProject = { id: 1, name: 'Test Project', web_url: 'project-url' };
    const mockComments = [{ id: 1, body: 'General Comment', created_at: '2023-10-27T09:00:00Z', type: 'Note' }];
    const mockInlineComments = [{ id: 2, body: 'Inline Comment', created_at: '2023-10-27T09:05:00Z', type: 'DiffNote' }];
    const mockCommits = [{ id: 'abc', message: 'Commit 1' }]; // Transformed commit structure

    beforeEach(() => {
      // Reset mocks for each test
      jest.restoreAllMocks();
    });

    it.skip('should transform MR info correctly on success', async () => {
        // Mock dependencies
        jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue([mockProject]);
        
        const commentsMock = jest.spyOn(gitlabUtils, 'getMRComments')
          .mockResolvedValue([...mockComments, ...mockInlineComments]);
        
        const commitsMock = jest.spyOn(gitlabUtils, 'getMRCommits')
          .mockResolvedValue(mockCommits);

        const result = await gitlabUtils.getTransformedMRInfo(mockRevision);
        
        expect(commentsMock).toHaveBeenCalledWith(mockRevision.project_id, mockRevision.iid);
        expect(commitsMock).toHaveBeenCalledWith(mockRevision.project_id, mockRevision.iid);

        expect(result).toEqual({
            id: 101,
            title: '[JIRA-1] Test MR',
            summary: 'MR Description',
            status: 'mergeable',
            url: 'mr-url',
            author: { name: 'Author Name', username: 'author_user' },
            dateModified: '2023-10-27T10:00:00Z',
            project: 'Test Project',
            projectUrl: 'project-url',
            projectId: 1,
            jiraId: 'JIRA-1',
            branch: 'feature-branch',
            reviewers: [{ id: 2, name: 'Reviewer 1' }],
            comments: expect.arrayContaining([...mockComments, ...mockInlineComments]), 
            pipeline: 'success',
            inlineComments: expect.arrayContaining(mockInlineComments),
            commits: mockCommits,
            diff_refs: { base_sha: 'base', head_sha: 'head', start_sha: 'start' }
        });
    }, 10000);

    it('should return null if project not found in localStorage', async () => {
        // Mock empty projects array
        jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue([]);
        
        // Spy on dependencies to make sure they're not called
        const commentsMock = jest.spyOn(gitlabUtils, 'getMRComments');
        const commitsMock = jest.spyOn(gitlabUtils, 'getMRCommits');

        const result = await gitlabUtils.getTransformedMRInfo({ ...mockRevision, project_id: 999 });
        expect(result).toBeNull();
        expect(commentsMock).not.toHaveBeenCalled();
        expect(commitsMock).not.toHaveBeenCalled();
    });

    it.skip('should return null and log error if getMRComments fails', async () => {
        // Mock projects
        jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue([mockProject]);
        
        // Mock getMRComments to throw error
        const error = new Error('Failed to fetch comments');
        jest.spyOn(gitlabUtils, 'getMRComments').mockRejectedValue(error);
        
        // Spy on getMRCommits to verify it's not called after the error
        const commitsMock = jest.spyOn(gitlabUtils, 'getMRCommits');
        
        const result = await gitlabUtils.getTransformedMRInfo(mockRevision);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error during transformation'), error);
        expect(commitsMock).not.toHaveBeenCalled();
    }, 10000);

    it.skip('should return null and log error if getMRCommits fails', async () => {
        // Mock projects
        jest.spyOn(gitlabUtils, 'safeJSONParse').mockReturnValue([mockProject]);
        
        // Mock getMRComments to succeed but getMRCommits to fail
        const commentsMock = jest.spyOn(gitlabUtils, 'getMRComments')
          .mockResolvedValue([]);
        
        const error = new Error('Failed to fetch commits');
        jest.spyOn(gitlabUtils, 'getMRCommits').mockRejectedValue(error);
        
        const result = await gitlabUtils.getTransformedMRInfo(mockRevision);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error during transformation'), error);
        expect(commentsMock).toHaveBeenCalled();
    }, 10000);
  });

  describe('getMRDiff', () => {
    const projectId = 123;
    const mrIid = 456;
    const mockDiffResponse = {
        changes: [
            {
                old_path: 'file_a.txt',
                new_path: 'file_a.txt',
                diff: '@@ -1 +1 @@\n-old\n+new',
                new_file: false,
                renamed_file: false,
                deleted_file: false
            },
            {
                old_path: 'file_b.txt',
                new_path: 'file_new_b.txt',
                diff: 'diff for renamed file',
                new_file: false,
                renamed_file: true,
                deleted_file: false
            }
        ]
    };
    const expectedParsedDiffs = [
         {
            oldPath: 'file_a.txt',
            newPath: 'file_a.txt',
            diff: '@@ -1 +1 @@\n-old\n+new',
            isNewFile: false,
            isRenamedFile: false,
            isDeletedFile: false
        },
        {
            oldPath: 'file_b.txt',
            newPath: 'file_new_b.txt',
            diff: 'diff for renamed file',
            isNewFile: false,
            isRenamedFile: true,
            isDeletedFile: false
        }
    ];

     beforeEach(() => {
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'gitlabToken') return JSON.stringify({ token: 'valid-token' });
            if (key === 'gitlabUrl') return 'http://gitlab.example.com';
            return null;
        });
    });

    it('should fetch and parse MR diff correctly', async () => {
        window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockDiffResponse) });

        const result = await gitlabUtils.getMRDiff(projectId, mrIid);

        expect(window.fetch).toHaveBeenCalledWith(
            `http://gitlab.example.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes`,
            expect.any(Object)
        );
        expect(result).toEqual(expectedParsedDiffs);
    });

    it('should return empty array if changes are missing in response', async () => {
       window.fetch.mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) }); // No changes array
       const result = await gitlabUtils.getMRDiff(projectId, mrIid);
       expect(result).toEqual([]);
    });

    it('should return empty array on fetch error', async () => {
        window.fetch.mockRejectedValueOnce(new Error('API Error'));
        const result = await gitlabUtils.getMRDiff(projectId, mrIid);
        expect(result).toEqual([]);
    });

     it('should return empty array if response is not ok', async () => {
        window.fetch.mockResolvedValueOnce({ ok: false, statusText: 'Server Error' });
        const result = await gitlabUtils.getMRDiff(projectId, mrIid);
        expect(result).toEqual([]);
    });
  });
});
