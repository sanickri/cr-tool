# CR-Tool API Integration Documentation

## 1. GitLab API Integration

CR-Tool integrates with GitLab to fetch and manage merge requests. The integration is implemented in `gitlabUtils.js`.

### 1.1 Authentication

#### OAuth 2.0 Flow
- **Configuration Requirements**:
  - GitLab Instance URL
  - Application ID
  - Application Secret
  - Redirect URI
  - Expiration settings

#### Token Management
- Access tokens stored in localStorage
- Refresh tokens for maintaining access
- Automatic token refresh when expired

### 1.2 Core API Methods

| Method | Purpose | Parameters |
|--------|---------|------------|
| `isGitlabTokenValid()` | Validates stored GitLab token | None |
| `getMyGitlabUser()` | Fetches current user information | None |
| `getGitlabProjects()` | Retrieves list of GitLab projects | None |
| `getGitlabMergeRequests()` | Fetches merge requests from projects | projectIds |
| `getMergeRequestDetails()` | Gets detailed information about a specific MR | projectId, mergeRequestId |

### 1.3 Data Structures

#### Merge Request Object
```javascript
{
  id: "gitlab-mr-123",
  title: "Feature: Add new component",
  description: "Adds new component for...",
  author: { name: "User Name", avatar: "url" },
  reviewers: [...],
  status: "open|merged|closed",
  created_at: "timestamp",
  updated_at: "timestamp",
  source: "gitlab",
  url: "https://gitlab.instance/project/merge_requests/123"
}
```

## 2. Phabricator API Integration

CR-Tool integrates with Phabricator to fetch and manage differentials. The integration is implemented in `phabricatorUtils.js`.

### 2.1 Authentication

#### Conduit API Token
- **Configuration Requirements**:
  - Phabricator Instance URL
  - API Token
  - User PHID (optional)

### 2.2 Core API Methods

| Method | Purpose | Parameters |
|--------|---------|------------|
| `isPhabricatorTokenValid()` | Validates stored Phabricator token | None |
| `getMyPhabricatorUser()` | Fetches current user information | None |
| `getPhabricatorRevisions()` | Retrieves list of differentials | None |
| `getRevisionDetails()` | Gets detailed information about a specific differential | revisionId |
| `getRevisionComments()` | Fetches comments on a differential | revisionId |

### 2.3 Data Structures

#### Differential Object
```javascript
{
  id: "phab-diff-123",
  title: "Feature: Add new component",
  description: "Adds new component for...",
  author: { name: "User Name", avatar: "url" },
  reviewers: [...],
  status: "needs-review|accepted|rejected",
  created_at: "timestamp",
  updated_at: "timestamp",
  source: "phabricator",
  url: "https://phabricator.instance/D123"
}
```

## 3. Unified Data Model

CR-Tool normalizes data from both APIs into a common format for unified display.

### 3.1 Common Revision Object
```javascript
{
  id: "source-type-id",
  title: "Revision title",
  description: "Revision description",
  author: { name: "Author Name", avatar: "url" },
  reviewers: [{ name: "Reviewer Name", status: "approved|requested|rejected" }],
  status: "open|merged|closed|needs-review|accepted|rejected",
  created_at: "timestamp",
  updated_at: "timestamp",
  source: "gitlab|phabricator",
  url: "https://source.instance/path/to/revision",
  comments: [
    { 
      author: "Comment Author",
      text: "Comment text",
      timestamp: "comment timestamp"
    }
  ]
}
```

## 4. Error Handling

### 4.1 API Error Handling
- Connection errors are caught and displayed to the user
- Authentication failures trigger re-authentication workflows
- Rate limiting is handled with appropriate retry mechanisms

### 4.2 Mock Mode
For development without API access, mock mode provides simulated data:
- Enable via environment configuration
- Provides realistic test data that mimics API responses
- Useful for UI development and testing without external dependencies

## 5. Common Integration Patterns

### 5.1 Adding a New Integration Source
1. Create a new utility file (e.g., `newSourceUtils.js`)
2. Implement authentication methods
3. Implement data fetching methods
4. Create data normalization functions to match the common revision object format
5. Add the source to the UI components

### 5.2 API Request Pattern
```javascript
async function apiRequest(endpoint, params) {
  try {
    // Make API request with appropriate headers/authentication
    const response = await axios.request({...});
    
    // Process successful response
    return processResponse(response);
  } catch (error) {
    // Handle error cases
    handleApiError(error);
  }
}
``` 