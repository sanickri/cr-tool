# CR-Tool Technical Documentation

## 1. Overview

CR-Tool is a code review management application that integrates with both GitLab and Phabricator. It allows users to view, manage, and search through code revisions from multiple sources in a unified interface.

## 2. Application Architecture

### 2.1 Tech Stack
- **Frontend**: React.js with React Router for navigation
- **UI Components**: Material-UI (MUI)
- **Date Handling**: Day.js
- **HTTP Requests**: Axios
- **Routing**: React Router

### 2.2 Main Components Structure

```
src/
├── AccountDetails/        # User account management
├── LandingPage/           # Landing page components
├── Revisions/             # Code revision related components
├── utils/                 # Utility functions and helpers
├── App.js                 # Main application component
├── index.js               # Application entry point
└── index.css              # Global styles
```

## 3. Key Components

### 3.1 App Component (`App.js`)
The main container component that sets up the routing structure and manages global state including:
- Authentication state for GitLab and Phabricator
- Dialog visibility state
- User configuration settings
- Revision data storage

### 3.2 Revisions Module

- **RevisionDetail.js**: Displays detailed information about a specific code revision
- **RevisionsList.js**: Renders a list of revisions with filtering and sorting capabilities
- **RevisionSearch.js**: Provides search functionality for finding specific revisions

### 3.3 LandingPage Module

- **LandingPage.js**: Main dashboard showing revision summaries
- **TopMenu.js**: Navigation bar with application controls
- **GitlabDialog.js**: Configuration dialog for GitLab integration
- **PhabricatorDialog.js**: Configuration dialog for Phabricator integration
- **FetchProjectsDialog.js**: Dialog for selecting and fetching GitLab projects

### 3.4 AccountDetails Module

- **AccountDetails.js**: User account management and settings

### 3.5 Utilities

- **gitlabUtils.js**: Functions for interacting with the GitLab API
- **phabricatorUtils.js**: Functions for interacting with the Phabricator API
- **mapStatusToIcon.js**: Maps revision status to corresponding icons
- **ErrorBoundary.js**: React error boundary for graceful error handling
- **slackWorker.js**: Utility for Slack integrations

## 4. Data Flow

1. **Authentication Flow**:
   - Users configure GitLab and/or Phabricator credentials
   - Tokens are stored in localStorage
   - App validates connections and fetches user information

2. **Revisions Flow**:
   - Fetch revisions from configured sources (GitLab, Phabricator)
   - Store in application state
   - Display in unified interface with source-specific handling

## 5. Key Features

### 5.1 Multi-Source Integration
- Integration with GitLab for merge requests
- Integration with Phabricator for diffs
- Unified view of revisions from different sources

### 5.2 Revision Management
- View revision details including comments, changes, and status
- Search and filter revisions
- Track revision status and updates

### 5.3 Account Management
- Configure integration settings
- Manage API tokens and connection parameters

## 6. Authentication

### 6.1 GitLab Authentication
- Uses OAuth 2.0 flow with redirect URI
- Stores access token, refresh token, and expiration time
- Auto-refresh capability for tokens

### 6.2 Phabricator Authentication
- API token-based authentication
- Configurable API endpoint

## 7. Data Storage

Data is primarily stored in:
- React state for runtime data
- localStorage for persistent settings including:
  - API tokens
  - User preferences
  - Connection settings

## 8. Error Handling

- React ErrorBoundary component for UI error recovery
- Axios error handling for API requests
- Conditional rendering based on connection status

## 9. Development Guides

### 9.1 Adding a New Integration Source
1. Create utility functions in `utils/` directory
2. Add configuration dialog in `LandingPage/`
3. Extend App.js state to include new connection status
4. Update RevisionsList to handle the new source

### 9.2 Adding New Features
1. Identify the appropriate component to modify
2. Extend the state management as needed
3. Update UI components to reflect new capabilities
4. Add necessary API utility functions

## 10. Testing

Testing is set up with Jest and React Testing Library in `setupTests.js`.
