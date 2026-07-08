import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from '../components/HomeScreen';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock socket
vi.mock('../socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
  }
}));

// Mock motion/react to render components synchronously
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, layoutId, ...domProps } = props;
      return <div ref={ref} {...domProps}>{children}</div>;
    }),
    aside: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, layoutId, ...domProps } = props;
      return <aside ref={ref} {...domProps}>{children}</aside>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockNotificationProps = {
  preferences: {
    messages: true,
    mood: true,
    leaf: true,
    pet: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundMode: 'default' as const,
    soundId: 'gentle_bloom',
  },
  updatePreferences: vi.fn().mockResolvedValue(undefined),
  permission: 'default' as const,
  toggleMasterSwitch: vi.fn().mockResolvedValue('granted' as const),
};

describe('HomeScreen', () => {
  const mockUser = {
    id: '1',
    name: 'Test',
    seedCode: 'ABCD',
    mood: 'good' as const,
    partnerId: '2',
  };

  it('should display the room name (Sanctuary by default)', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);
    expect(screen.getByText('Sanctuary')).toBeDefined();
  });

  it('should render the hamburger menu button', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);
    const hamburger = screen.getByTestId('hamburger-btn');
    expect(hamburger).toBeDefined();
    expect(hamburger.getAttribute('aria-label')).toBe('Open menu');
  });

  it('should open sidebar when hamburger button is clicked', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);

    // Sidebar should not be visible initially
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click hamburger
    const hamburger = screen.getByTestId('hamburger-btn');
    fireEvent.click(hamburger);

    // Sidebar should now be visible
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Chat')).toBeDefined();
    expect(screen.getByText('Scrapbook')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('should close sidebar when backdrop is clicked', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);

    // Open sidebar
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    expect(screen.getByRole('dialog')).toBeDefined();

    // Click backdrop
    fireEvent.click(screen.getByTestId('sidebar-backdrop'));

    // Sidebar should be closed
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should close sidebar when close button is clicked', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);

    // Open sidebar
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    expect(screen.getByRole('dialog')).toBeDefined();

    // Click close button
    fireEvent.click(screen.getByTestId('sidebar-close'));

    // Sidebar should be closed
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should display multiple buttons including hamburger', () => {
    render(<HomeScreen user={mockUser} onUpdateUser={() => {}} notificationProps={mockNotificationProps} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
  });
});
