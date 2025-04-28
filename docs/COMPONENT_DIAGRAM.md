# CR-Tool Component Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                              App.js                               │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │
│  │ Global State│  │  Routes     │  │ Dialog Management         │  │
│  └─────────────┘  └─────────────┘  └───────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                │                 │                │
    ┌───────────┘     ┌───────────┘     ┌─────────┘
    │                 │                 │
    ▼                 ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌───────────────┐
│ LandingPage │  │ RevisionDetail│  │AccountDetails │
└─────────────┘  └──────────────┘  └───────────────┘
    │                 │
    │                 │
    ▼                 ▼
┌─────────────┐  ┌──────────────┐
│RevisionsList│  │RevisionSearch│
└─────────────┘  └──────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                              Dialogs                              │
│                                                                   │
│  ┌───────────────┐  ┌─────────────────┐  ┌───────────────────┐    │
│  │ GitlabDialog  │  │PhabricatorDialog│  │FetchProjectsDialog│    │
│  └───────────────┘  └─────────────────┘  └───────────────────┘    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                              Utils                                │
│                                                                   │
│  ┌────────────┐  ┌─────────────────┐  ┌────────────────┐          │
│  │gitlabUtils │  │phabricatorUtils │  │ErrorBoundary   │          │
│  └────────────┘  └─────────────────┘  └────────────────┘          │
│                                                                   │
│  ┌────────────┐  ┌─────────────────┐                              │
│  │slackWorker │  │mapStatusToIcon  │                              │
│  └────────────┘  └─────────────────┘                              │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                        Data Flow                                  │
│                                                                   │
│  ┌─────────────┐     API Calls      ┌───────────────────┐         │
│  │  GitLab     │◄─────────────────► │                   │         │
│  └─────────────┘                    │                   │         │
│                                     │    Application    │         │
│  ┌─────────────┐     API Calls      │      State       │         │
│  │ Phabricator │◄─────────────────► │                   │         │
│  └─────────────┘                    │                   │         │
│                                     └───────────────────┘         │
│                                             │                     │
│                                             ▼                     │
│                                     ┌───────────────────┐         │
│                                     │  User Interface   │         │
│                                     └───────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### Core Components
- **App.js**: Central component managing global state and routing
- **LandingPage**: Main dashboard displaying revision summaries
- **RevisionDetail**: Detailed view of a specific revision
- **RevisionsList**: List component for displaying and filtering revisions
- **RevisionSearch**: Search interface for finding revisions
- **AccountDetails**: User account and settings management

### Dialog Components
- **GitlabDialog**: Configuration for GitLab integration
- **PhabricatorDialog**: Configuration for Phabricator integration
- **FetchProjectsDialog**: Interface for selecting GitLab projects to track

### Utility Components/Functions
- **gitlabUtils**: API functions for GitLab integration
- **phabricatorUtils**: API functions for Phabricator integration
- **ErrorBoundary**: Error handling component
- **slackWorker**: Slack integration utilities
- **mapStatusToIcon**: UI helper for status visualization

### Data Flow
- External APIs (GitLab, Phabricator) ↔ Application State ↔ User Interface 