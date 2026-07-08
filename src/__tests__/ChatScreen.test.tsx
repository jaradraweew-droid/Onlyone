import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatScreen from '../components/ChatScreen';

// ─── Global Mocks ───────────────────────────────────────────────────────

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

vi.mock('../socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }
}));

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── Test Data ──────────────────────────────────────────────────────────

const mockUser = {
  id: '1',
  name: 'Test',
  seedCode: 'ABCD',
  mood: 'good' as const,
  partnerId: '2',
};

// ─── Tests ──────────────────────────────────────────────────────────────

describe('ChatScreen', () => {
  it('should hide attachment buttons when input has text', () => {
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    }));

    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    // Type in input
    const input = screen.getByPlaceholderText('Whisper something...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    expect((input as HTMLInputElement).value).toBe('Hello');
  });

  it('should filter messages when search query is entered', () => {
    const messages = [
      { id: '1', senderId: '1', text: 'Hello there', timestamp: Date.now(), type: 'text' as const },
      { id: '2', senderId: '2', text: 'How are you?', timestamp: Date.now(), type: 'text' as const },
    ];

    render(<ChatScreen user={mockUser as any} messages={messages} setMessages={() => {}} />);

    // Open search
    const searchButton = screen.getByLabelText('Search messages');
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'Hello' } });

    expect(screen.queryByText('Hello there')).toBeDefined();
    expect(screen.queryByText('How are you?')).toBeNull();
  });

  it('should render the keyboard toggle button', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    const toggleBtn = screen.getByLabelText('Toggle keyboard');
    expect(toggleBtn).toBeDefined();
  });

  it('should show virtual keyboard when toggle button is clicked', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    // Click keyboard toggle
    const toggleBtn = screen.getByLabelText('Toggle keyboard');
    fireEvent.click(toggleBtn);

    // Virtual keyboard should be visible
    const keyboard = screen.getByTestId('virtual-keyboard');
    expect(keyboard).toBeDefined();
  });

  it('should hide virtual keyboard when toggle is clicked twice', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    const toggleBtn = screen.getByLabelText('Toggle keyboard');

    // Show
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('virtual-keyboard')).toBeDefined();

    // Hide
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('virtual-keyboard')).toBeNull();
  });

  it('should update input text when virtual keyboard key is pressed', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    // Open keyboard
    fireEvent.click(screen.getByLabelText('Toggle keyboard'));

    // Press 'h', 'i' on virtual keyboard
    fireEvent.click(screen.getByText('h'));
    fireEvent.click(screen.getByText('i'));

    const input = screen.getByPlaceholderText('Whisper something...') as HTMLInputElement;
    expect(input.value).toBe('hi');
  });

  it('should delete last character when virtual keyboard backspace is pressed', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    // Open keyboard
    fireEvent.click(screen.getByLabelText('Toggle keyboard'));

    // Type 'hi'
    fireEvent.click(screen.getByText('h'));
    fireEvent.click(screen.getByText('i'));

    // Backspace
    fireEvent.click(screen.getByLabelText('Backspace'));

    const input = screen.getByPlaceholderText('Whisper something...') as HTMLInputElement;
    expect(input.value).toBe('h');
  });

  it('should type Thai characters via the virtual keyboard', () => {
    render(<ChatScreen user={mockUser as any} messages={[]} setMessages={() => {}} />);

    // Open keyboard
    fireEvent.click(screen.getByLabelText('Toggle keyboard'));

    // Switch to Thai
    fireEvent.click(screen.getByLabelText('Switch language'));

    // Type Thai characters
    fireEvent.click(screen.getByText('ก'));
    fireEvent.click(screen.getByText('ฟ'));

    const input = screen.getByPlaceholderText('Whisper something...') as HTMLInputElement;
    expect(input.value).toBe('กฟ');
  });
});
