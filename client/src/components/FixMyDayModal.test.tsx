import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FixMyDayModal from '../components/FixMyDayModal';

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const { api } = require('../services/api');

const renderModal = (overrides = {}) =>
  render(<FixMyDayModal isOpen={true} onClose={jest.fn()} {...overrides} />);

describe('FixMyDayModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        data: {
          addresses: { home: '10 Home Rd', work: '20 Work Ave' },
        },
      },
    });
  });

  it('renders the Plan tab by default', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });
    expect(screen.getByText('Today Route')).toBeInTheDocument();
  });

  it('shows Work and Both tiles when addresses are different', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
    });
  });

  it('hides Work and Both tiles when user works from home (same addresses)', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          addresses: { home: '10 Home Rd', work: '10 Home Rd' },
        },
      },
    });
    renderModal();
    await waitFor(() => {
      expect(screen.getByTestId('route-mode-home')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('route-mode-work')).not.toBeInTheDocument();
      expect(screen.queryByTestId('route-mode-both')).not.toBeInTheDocument();
    });
  });

  it('shows task order mode selector after a location is chosen', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Home'));
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => {
      expect(screen.getByText(/by priority/i)).toBeInTheDocument();
      expect(screen.getByText(/i'll pick the tasks/i)).toBeInTheDocument();
    });
  });

  it('Pick Tasks tab is disabled until manual mode is selected', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Pick Tasks'));
    const pickTab = screen.getByRole('button', { name: /pick tasks/i });
    expect(pickTab).toBeDisabled();
  });

  it('Pick Tasks tab becomes enabled when manual mode is chosen', async () => {
    api.get.mockImplementation((url: string) => {
      if (url.includes('tasks')) {
        return Promise.resolve({ data: { tasks: [] } });
      }
      return Promise.resolve({
        data: { data: { addresses: { home: '10 Home Rd', work: '20 Work Ave' } } },
      });
    });

    renderModal();
    await waitFor(() => screen.getByText('Home'));
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => screen.getByText(/i'll pick the tasks/i));
    fireEvent.click(screen.getByText(/i'll pick the tasks/i));
    await waitFor(() => {
      const pickTab = screen.getByRole('button', { name: /pick tasks/i });
      expect(pickTab).not.toBeDisabled();
    });
  });
});
