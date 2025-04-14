import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThumbDown, ThumbUp, Merge, HeartBroken, Flaky, ReportGmailerrorred, FlightTakeoff, HourglassTop, CheckCircle, Feedback } from '@mui/icons-material';
import mapStatusToIcon from '../../src/utils/mapStatusToIcon';

// Mock the MUI icons
jest.mock('@mui/icons-material', () => ({
  ThumbDown: () => <div data-testid="thumb-down-icon" />,
  ThumbUp: () => <div data-testid="thumb-up-icon" />,
  Merge: () => <div data-testid="merge-icon" />,
  HeartBroken: () => <div data-testid="heart-broken-icon" />,
  Flaky: () => <div data-testid="flaky-icon" />,
  ReportGmailerrorred: () => <div data-testid="report-error-icon" />,
  FlightTakeoff: () => <div data-testid="flight-takeoff-icon" />,
  HourglassTop: () => <div data-testid="hourglass-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Feedback: () => <div data-testid="feedback-icon" />
}));

// Mock MUI Tooltip
jest.mock('@mui/material', () => ({
  Tooltip: ({ children, title }) => <div data-testid="tooltip" title={title}>{children}</div>
}));

describe('mapStatusToIcon', () => {
  const renderIcon = (statusKey) => {
    const IconComponent = mapStatusToIcon[statusKey];
    render(IconComponent);
  };

  test('should render ThumbDown icon for requested_changes status', () => {
    renderIcon('requested_changes');
    expect(screen.getByTestId('thumb-down-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Changes requested');
  });

  test('should render Flaky icon for not_approved status', () => {
    renderIcon('not_approved');
    expect(screen.getByTestId('flaky-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Waiting on approval');
  });

  test('should render ThumbUp icon for approved status', () => {
    renderIcon('approved');
    expect(screen.getByTestId('thumb-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Approved');
  });

  test('should render HourglassTop icon for unchecked status', () => {
    renderIcon('unchecked');
    expect(screen.getByTestId('hourglass-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Unchecked');
  });

  test('should render ThumbUp icon for mergeable status', () => {
    renderIcon('mergeable');
    expect(screen.getByTestId('thumb-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Mergeable');
  });

  test('should render Feedback icon for discussions_not_resolved status', () => {
    renderIcon('discussions_not_resolved');
    expect(screen.getByTestId('feedback-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Discussion not resolved');
  });

  test('should render Merge icon for conflict status', () => {
    renderIcon('conflict');
    expect(screen.getByTestId('merge-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Conflict');
  });

  test('should render ReportGmailerrorred icon for need_rebase status', () => {
    renderIcon('need_rebase');
    expect(screen.getByTestId('report-error-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Need rebase');
  });

  test('should render HeartBroken icon for broken_status', () => {
    renderIcon('broken_status');
    expect(screen.getByTestId('heart-broken-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Broken Status');
  });

  test('should render ThumbUp icon for accepted status', () => {
    renderIcon('accepted');
    expect(screen.getByTestId('thumb-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Approved');
  });

  test('should render ThumbUp icon for Accepted status (capitalized)', () => {
    renderIcon('Accepted');
    expect(screen.getByTestId('thumb-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Approved');
  });

  test('should render HourglassTop icon for needs-review status', () => {
    renderIcon('needs-review');
    expect(screen.getByTestId('hourglass-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Unchecked');
  });

  test('should render ThumbDown icon for needs-revision status', () => {
    renderIcon('needs-revision');
    expect(screen.getByTestId('thumb-down-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Changes requested');
  });

  test('should render FlightTakeoff icon for abandoned status', () => {
    renderIcon('abandoned');
    expect(screen.getByTestId('flight-takeoff-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Abandoned');
  });

  test('should render CheckCircle icon for success status', () => {
    renderIcon('success');
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('title', 'Success');
  });

  test('should have all statuses defined in the map', () => {
    const expectedStatuses = [
      'requested_changes',
      'not_approved',
      'approved',
      'unchecked',
      'mergeable',
      'discussions_not_resolved',
      'conflict',
      'need_rebase',
      'broken_status',
      'accepted',
      'Accepted',
      'needs-review',
      'needs-revision',
      'abandoned',
      'success'
    ];

    expectedStatuses.forEach(status => {
      expect(mapStatusToIcon[status]).toBeDefined();
    });
  });
});
