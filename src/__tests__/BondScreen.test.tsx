import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BondScreen from '../components/BondScreen';

// ─── Mocks ──────────────────────────────────────────────────────────────────
// vi.hoisted() ensures these are initialized BEFORE vi.mock() factories run
const { mockSocket, mockSocketHandlers } = vi.hoisted(() => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const socket = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      }
    }),
    once: vi.fn(),
    emit: vi.fn(),
  };
  return { mockSocket: socket, mockSocketHandlers: handlers };
});

// Helper to simulate server emitting an event to the client
const simulateServerEvent = (event: string, ...args: unknown[]) => {
  (mockSocketHandlers[event] ?? []).forEach((handler) => handler(...args));
};

vi.mock('../socket', () => ({ socket: mockSocket }));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.HTMLAttributes<HTMLDivElement>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  name: 'Alice',
  seedCode: 'Quiet-Willow-657',
  mood: 'good' as const,
  partnerId: undefined as string | undefined,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BondScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all socket handler registrations
    Object.keys(mockSocketHandlers).forEach((key) => {
      delete mockSocketHandlers[key];
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────

  it('should render the user seed code', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    expect(screen.getByText('Quiet-Willow-657')).toBeDefined();
  });

  it('should render the Connect Sanctuary button', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    expect(screen.getByText('Connect Sanctuary')).toBeDefined();
  });

  it('should disable Connect Sanctuary button when partner code input is empty', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const button = screen.getByText('Connect Sanctuary').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should enable Connect Sanctuary button when partner code is entered', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    const button = screen.getByText('Connect Sanctuary').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  // ─── Copy Seed Code ────────────────────────────────────────────────────

  it('should call clipboard.writeText when copy button is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const copyBtn = screen.getByLabelText('Copy seed code');
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('Quiet-Willow-657');
  });

  // ─── Bond Request ──────────────────────────────────────────────────────

  it('should emit bond_request with correct data when Connect Sanctuary is clicked', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    expect(mockSocket.emit).toHaveBeenCalledWith('bond_request', {
      targetCode: 'Calm-Meadow-408',
      user: mockUser,
    });
  });

  it('should trim whitespace from partner code before emitting', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: '  Calm-Meadow-408  ' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    expect(mockSocket.emit).toHaveBeenCalledWith('bond_request', expect.objectContaining({
      targetCode: 'Calm-Meadow-408',
    }));
  });

  it('should submit bond request when Enter key is pressed in the input', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockSocket.emit).toHaveBeenCalledWith('bond_request', expect.objectContaining({
      targetCode: 'Calm-Meadow-408',
    }));
  });

  // ─── bond_request_sent feedback ────────────────────────────────────────

  it('should show "Bond request sent" status after server confirms', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    act(() => {
      simulateServerEvent('bond_request_sent', { targetCode: 'Calm-Meadow-408' });
    });

    expect(screen.getByText(/Bond request sent/i)).toBeDefined();
  });

  // ─── bond_partner_offline feedback ────────────────────────────────────

  it('should show "Partner is not online" message when partner is offline', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    act(() => {
      simulateServerEvent('bond_partner_offline', { targetCode: 'Calm-Meadow-408' });
    });

    expect(screen.getByText(/Partner is not online yet/i)).toBeDefined();
  });

  // ─── Timeout / error fallback ──────────────────────────────────────────

  it('should show error message after 8 second timeout with no server response', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText(/Connection error/i)).toBeDefined();
  });

  // ─── bond_accepted ──────────────────────────────────────────────────────

  it('should call onUpdateUser with partnerId when bond_accepted is received', () => {
    const onUpdateUser = vi.fn();
    render(<BondScreen user={mockUser} onUpdateUser={onUpdateUser} />);

    act(() => {
      simulateServerEvent('bond_accepted', { seedCode: 'Calm-Meadow-408' });
    });

    expect(onUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: 'Calm-Meadow-408' })
    );
  });

  // ─── Incoming bond request ──────────────────────────────────────────────

  it('should show incoming bond request banner when bond_requested is received', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);

    act(() => {
      simulateServerEvent('bond_requested', { seedCode: 'Calm-Meadow-408', name: 'Bob' });
    });

    // Text is split across <strong>Bob</strong> and " wants to bond!" — use container query
    expect(screen.getByText('Accept Bond')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText(/wants to bond!/i)).toBeDefined();
  });

  it('should emit bond_accept and call onUpdateUser when Accept Bond is clicked', () => {
    const onUpdateUser = vi.fn();
    render(<BondScreen user={mockUser} onUpdateUser={onUpdateUser} />);

    act(() => {
      simulateServerEvent('bond_requested', { seedCode: 'Calm-Meadow-408', name: 'Bob' });
    });

    fireEvent.click(screen.getByText('Accept Bond'));

    expect(mockSocket.emit).toHaveBeenCalledWith('bond_accept', {
      targetCode: 'Calm-Meadow-408',
      user: mockUser,
    });
    expect(onUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: 'Calm-Meadow-408' })
    );
  });

  // ─── Socket cleanup ─────────────────────────────────────────────────────

  it('should unregister socket listeners on unmount', () => {
    const { unmount } = render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('bond_requested', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('bond_accepted', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('bond_request_sent', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('bond_partner_offline', expect.any(Function));
  });

  // ─── Status reset on new input ─────────────────────────────────────────

  it('should reset error status when partner code input changes', () => {
    render(<BondScreen user={mockUser} onUpdateUser={vi.fn()} />);
    const input = screen.getByPlaceholderText('e.g. Green-Willow-123');
    fireEvent.change(input, { target: { value: 'Calm-Meadow-408' } });
    fireEvent.click(screen.getByText('Connect Sanctuary').closest('button')!);

    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText(/Connection error/i)).toBeDefined();

    // Typing resets status
    fireEvent.change(input, { target: { value: 'New-Code-999' } });
    expect(screen.queryByText(/Connection error/i)).toBeNull();
  });
});
