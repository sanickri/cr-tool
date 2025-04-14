import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // For interactions
import AccountDetails from '../../src/AccountDetails/AccountDetails'; // Adjust path

describe('AccountDetails Component', () => {

  beforeEach(() => {
    // Mock localStorage (Jest uses jsdom, localStorage is available)
    localStorage.clear();
  });

  // No afterEach needed with Jest auto-cleanup

  test('should render without crashing', () => {
    render(<AccountDetails />);
    expect(screen.getByText('Account Details')).toBeInTheDocument();
  });

  test('should display "No GitLab account connected" when no GitLab user data is in localStorage', () => {
    render(<AccountDetails />);
    expect(screen.getByText('No GitLab account connected')).toBeInTheDocument();
  });

  test('should display GitLab user details when data is in localStorage', () => {
    const mockGitlabUser = { name: 'Git Lab', username: 'gitlabuser', email: 'git@example.com' };
    localStorage.setItem('gitlabUser', JSON.stringify(mockGitlabUser));
    render(<AccountDetails />);
    expect(screen.getByText(`Name: ${mockGitlabUser.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Username: ${mockGitlabUser.username}`)).toBeInTheDocument();
    expect(screen.getByText(`Email: ${mockGitlabUser.email}`)).toBeInTheDocument();
    expect(screen.queryByText('No GitLab account connected')).not.toBeInTheDocument();
  });

  test('should display "No Phabricator account connected" when no Phabricator user data is in localStorage', () => {
    render(<AccountDetails />);
    expect(screen.getByText('No Phabricator account connected')).toBeInTheDocument();
  });

  test('should display Phabricator user details when data is in localStorage', () => {
    const mockPhabUser = { name: 'Phab Ricator', username: 'phabuser', email: 'phab@example.com' };
    localStorage.setItem('phabUser', JSON.stringify(mockPhabUser));
    render(<AccountDetails />);
    expect(screen.getByText(`Name: ${mockPhabUser.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Username: ${mockPhabUser.username}`)).toBeInTheDocument();
    expect(screen.getByText(`Email: ${mockPhabUser.email}`)).toBeInTheDocument();
    expect(screen.queryByText('No Phabricator account connected')).not.toBeInTheDocument();
  });

  test('should render User Groups section', () => {
    render(<AccountDetails />);
    expect(screen.getByText('User Groups')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Group Name')[0]).toBeInTheDocument();
    expect(screen.getByLabelText('Users (comma-separated)')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add Group' })[0]).toBeInTheDocument();
  });

  test('should render Project Groups section', () => {
    render(<AccountDetails />);
    expect(screen.getByText('Project Groups')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Group Name')[1]).toBeInTheDocument();
    expect(screen.getByLabelText('Projects (comma-separated)')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add Group' })[1]).toBeInTheDocument();
  });

  test('should allow adding a new user group', async () => {
    const user = userEvent.setup();
    render(<AccountDetails />);

    await user.type(screen.getAllByLabelText('Group Name')[0], 'Test Group');
    await user.type(screen.getByLabelText('Users (comma-separated)'), 'user1, user2');
    await user.click(screen.getAllByRole('button', { name: 'Add Group' })[0]);

    expect(await screen.findByText('Test Group')).toBeInTheDocument();
    const userGroups = JSON.parse(localStorage.getItem('userGroups'));
    expect(userGroups).toHaveLength(1);
    expect(userGroups[0]).toEqual({ name: 'Test Group', users: ['user1', 'user2'] });
  });

  test('should allow adding a new project group', async () => {
    const user = userEvent.setup();
    render(<AccountDetails />);

    await user.type(screen.getAllByLabelText('Group Name')[1], 'Test Projects');
    await user.type(screen.getByLabelText('Projects (comma-separated)'), 'projA, projB');
    await user.click(screen.getAllByRole('button', { name: 'Add Group' })[1]);

    expect(await screen.findByText('Test Projects')).toBeInTheDocument();
    const projectGroups = JSON.parse(localStorage.getItem('projectGroups'));
    expect(projectGroups).toHaveLength(1);
    expect(projectGroups[0]).toEqual({ name: 'Test Projects', projects: ['projA', 'projB'] });
  });

  // Add more tests for:
  // - Editing existing groups
  // - Deleting groups
  // - Handling invalid input
});
