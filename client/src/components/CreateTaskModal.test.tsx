import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateTaskModal from '../components/CreateTaskModal';

// Mock the api module
jest.mock('../services/api', () => ({
  api: {
    post: jest.fn().mockResolvedValue({ data: { _id: 'new-task', title: 'Test' } }),
  },
}));

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
};

describe('CreateTaskModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders only the title input initially', () => {
    render(<CreateTaskModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/what needs to get done/i)).toBeInTheDocument();
    expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
  });

  it('shows due date and priority rows after typing a title', () => {
    render(<CreateTaskModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText(/what needs to get done/i);
    fireEvent.change(titleInput, { target: { value: 'Buy groceries' } });
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
  });

  it('Create button is disabled when only title is entered (no priority)', () => {
    render(<CreateTaskModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText(/what needs to get done/i);
    fireEvent.change(titleInput, { target: { value: 'Do something' } });
    const createButton = screen.getByRole('button', { name: /create task/i });
    expect(createButton).toBeDisabled();
  });

  it('Create button is enabled after title and priority are both set', () => {
    render(<CreateTaskModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText(/what needs to get done/i);
    fireEvent.change(titleInput, { target: { value: 'Fix the tap' } });

    const urgentButton = screen.getByRole('button', { name: /urgent/i });
    fireEvent.click(urgentButton);

    const createButton = screen.getByRole('button', { name: /create task/i });
    expect(createButton).not.toBeDisabled();
  });

  it('clicking More options reveals description and category fields', () => {
    render(<CreateTaskModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText(/what needs to get done/i);
    fireEvent.change(titleInput, { target: { value: 'Test task' } });

    const moreButton = screen.getByText(/more options/i);
    fireEvent.click(moreButton);

    expect(screen.getByPlaceholderText(/add details/i)).toBeInTheDocument();
    expect(screen.getByText(/category/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<CreateTaskModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText(/cancel/i));
    expect(onClose).toHaveBeenCalled();
  });
});
