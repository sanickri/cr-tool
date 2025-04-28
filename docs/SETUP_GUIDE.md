# CR-Tool Setup and Installation Guide

## Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)
- Access to GitLab and/or Phabricator instances (for production use)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sanickri/cr-tool.git
   cd cr-tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   REACT_APP_API_BASE_URL=http://localhost:3000
   ```

## Development Mode

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### GitLab Setup

1. Create a GitLab OAuth application:
   - Go to your GitLab instance → Admin Area → Applications
   - Create a new application with the following settings:
     - Name: CR-Tool
     - Redirect URI: `http://localhost:3000/oauth/callback`
     - Scopes: `api`, `read_user`, `read_api`
   - Note the Application ID and Secret

2. In the CR-Tool application:
   - Click the GitLab configuration icon in the top menu
   - Enter the GitLab URL, Application ID, Secret, and Redirect URI
   - Click Save and authenticate

### Phabricator Setup

1. Generate a Conduit API token:
   - In your Phabricator instance, go to Settings → Conduit API Tokens
   - Create a new API token with appropriate permissions
   - Note the token value

2. In the CR-Tool application:
   - Click the Phabricator configuration icon in the top menu
   - Enter the Phabricator URL and API token
   - Click Save

## Building for Production

1. Create a production build:
   ```bash
   npm run build
   ```

2. The build artifacts will be stored in the `build/` directory

3. Serve the production build:
   ```bash
   npx serve -s build
   ```

## Deployment Options

### Deploying to a Static Web Server

1. Copy the contents of the `build/` directory to your web server's root directory
2. Configure your web server to handle client-side routing:
   - For Apache, include a `.htaccess` file (already included in the build)
   - For Nginx, add the following to your server configuration:
     ```
     location / {
       try_files $uri $uri/ /index.html;
     }
     ```

### Deploying to a Docker Container

1. Build the Docker image:
   ```bash
   docker build -t cr-tool .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:80 cr-tool
   ```

3. Access the application at [http://localhost:8080](http://localhost:8080)

## Troubleshooting

### Common Issues

1. **GitLab authentication fails**
   - Verify the Application ID and Secret
   - Ensure the Redirect URI matches exactly what's configured in GitLab
   - Check that your GitLab instance is accessible from your network

2. **Phabricator integration not working**
   - Verify the API token has the correct permissions
   - Ensure the Phabricator URL is correct and accessible
   - Check for CORS issues if your Phabricator instance is on a different domain

3. **Blank screen after login**
   - Check the browser console for JavaScript errors
   - Verify that all required environment variables are set
   - Ensure your browser supports modern JavaScript features

## Support and Maintenance

- Run tests: `npm test`
- Check for linting issues: `npm run lint`
- Autofix prettier issues: `npx prettier src --write`
- Update dependencies: `npm update` 
