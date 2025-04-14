import { jest } from '@jest/globals';
import dayjs from 'dayjs';

import * as gitlabUtils from '../../src/utils/gitlabUtils';

// Mock console methods to prevent them from cluttering test output
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

// Mocking fetch
global.fetch = jest.fn();

// Mock localStorage
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

// Mock global location
delete window.location;
window.location = { href: '' };

describe('gitlabUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    fetch.mockClear();
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
      
      fetch.mockResolvedValueOnce({
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

      expect(fetch).toHaveBeenCalledWith(
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
      fetch.mockResolvedValueOnce({
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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await gitlabUtils.getMyGitlabUser();

      expect(fetch).toHaveBeenCalledWith(
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

      fetch.mockRejectedValueOnce(new Error('Network error'));

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

      // Mock fetch for each project ID
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProjects[0])
      });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProjects[1])
      });

      const result = await gitlabUtils.getProjectsByIds('123, 456');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects/123',
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://gitlab.example.com/api/v4/projects/456',
        expect.any(Object)
      );

      expect(result).toEqual(mockProjects);
      
      // Restore original implementation
      localStorage.getItem = originalGetItem;
    });
  });
});
