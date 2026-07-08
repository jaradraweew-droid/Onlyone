import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimelineScreen from '../components/TimelineScreen';
import { Message } from '../types';

beforeAll(() => {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  }));
});

vi.mock('motion/react', () => {
  const React = require('react');
  return {
    motion: {
      div: ({ children, ...props }: any) => React.createElement('div', props, children),
    },
    AnimatePresence: ({ children }: any) => children
  };
});

vi.mock('../socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }
}));

const mockUser = {
  id: 'user1',
  name: 'Test',
  seedCode: 'ABCD',
  mood: 'good' as any,
  partnerId: 'user2'
};

const mockMessages: Message[] = [
  {
    id: 'msg1',
    senderId: 'user1',
    text: '',
    timestamp: 1625555555000,
    type: 'image',
    imageUrl: 'test.jpg'
  },
  {
    id: 'msg2',
    senderId: 'user2',
    text: 'Caption',
    timestamp: 1625555565000,
    type: 'image',
    imageUrl: 'test2.jpg',
    reactions: { '❤️': ['user1'] },
    comments: [
      { id: 'c1', senderId: 'user1', text: 'Nice!', timestamp: 1625555575000 }
    ]
  }
];

describe('TimelineScreen', () => {
  it('should render photos and sort them by timestamp descending', () => {
    const setMessages = vi.fn();
    render(<TimelineScreen user={mockUser} messages={mockMessages} setMessages={setMessages} />);
    
    const images = screen.getAllByAltText(/^Memory from/);
    expect(images.length).toBe(2);
    expect((images[0] as HTMLImageElement).src).toContain('test2.jpg');
    expect(screen.getByText('Caption')).toBeDefined();
    expect(screen.getByText('Nice!')).toBeDefined();
  });

  it('should open comment input and allow adding comment', async () => {
    const setMessages = vi.fn();
    render(<TimelineScreen user={mockUser} messages={mockMessages} setMessages={setMessages} />);
    
    const actionButtons = screen.getAllByRole('button').filter(b => b.innerHTML.includes('<svg'));
    fireEvent.click(actionButtons[2]); 
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
    });
    
    const input = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(input, { target: { value: 'Awesome' } });
    
    const sendBtn = screen.getAllByRole('button').find(b => b.className.includes('bg-sage-500 text-white rounded-full flex items-center justify-center'));
    if (sendBtn) fireEvent.click(sendBtn);
    
    expect(setMessages).toHaveBeenCalled();
  });
});
