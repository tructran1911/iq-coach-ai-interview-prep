import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InterviewSetup from './InterviewSetup';

describe('InterviewSetup', () => {
  it('renders correctly', () => {
    render(<InterviewSetup onStart={() => {}} />);
    expect(screen.getByText('Job Title')).toBeInTheDocument();
    expect(screen.getByText('Job Description (JD)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start interview/i })).toBeDisabled();
  });

  it('enables the button when both fields are filled', () => {
    render(<InterviewSetup onStart={() => {}} />);
    const titleInput = screen.getByPlaceholderText(/e.g. Senior Software Engineer/i);
    const jdInput = screen.getByPlaceholderText(/paste the job description here/i);
    const startBtn = screen.getByRole('button', { name: /start interview/i });

    fireEvent.change(titleInput, { target: { value: 'Frontend Dev' } });
    fireEvent.change(jdInput, { target: { value: 'This is a JD' } });

    expect(startBtn).not.toBeDisabled();
  });

  it('calls onStart when button is clicked', () => {
    const onStartMock = vi.fn();
    render(<InterviewSetup onStart={onStartMock} />);
    
    const titleInput = screen.getByPlaceholderText(/e.g. Senior Software Engineer/i);
    const jdInput = screen.getByPlaceholderText(/paste the job description here/i);
    const startBtn = screen.getByRole('button', { name: /start interview/i });

    fireEvent.change(titleInput, { target: { value: 'Frontend Dev' } });
    fireEvent.change(jdInput, { target: { value: 'This is a JD' } });
    fireEvent.click(startBtn);

    expect(onStartMock).toHaveBeenCalledWith('Frontend Dev', 'This is a JD');
  });
});
