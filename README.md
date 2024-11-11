# Cr-Tool

Welcome to the early development version of My Tool! This project is designed to connect with your Git or Phabricator account to view all open revisions. Please note that as this is an early version, there will be many changes and improvements over time.

## Features

- Connect to Git or Phabricator accounts.
- View all open revisions.

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

1. Clone the repository:
``` 
git clone <repository-url>
cd <repository-directory> 
```
2. Install the dependencies
``` npm install ``` 
## Available Scripts

In the project directory, you can run:

### `npm start / npm run dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

This command will remove the single build dependency from your project, allowing full control over the configuration files and dependencies.

## Setup
### GIT
To set up Git OAuth, follow these steps:
1. Set up a token in your Git profile:
- Navigate to **Edit profile -> Applications.**
- Uncheck **confidential** and check the **api** scope.
- Set the redirect URI to the port where you run your app (e.g., 'http://localhost:3000/').
- Save the app ID and secret to your **`.env`** file:
```
REACT_APP_GITLAB_CLIENT_SECRET=<your_secret
REACT_APP_GITLAB_CLIENT_ID=<your_app_id
REACT_APP_GITLAB_REDIRECT_URL=<your_redirect_url>
```

2. Fill in your Git adress in the application to start using it.

### Phabricator
To set up Phabricator authentication, follow these steps:
1. Obtain an API token from **Settings -> Conduit API Tokens -> Generate Token.**
2. Save your token for login.
3. Obtain your PHID by running:
```curl -X POST -d api.token=<your_api_token> <your_phabricator_url>/api/user.whoami```
4. Save the PHID to your **`.env`** file:
```REACT_APP_PHID=<your_phid>```
5. Fill in your Phabricator URL and token in the application to start using it.