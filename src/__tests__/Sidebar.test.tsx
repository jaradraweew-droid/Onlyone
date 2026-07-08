import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

// Mock motion/react to render components synchronously without animations
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

// Mock compressImage
vi.mock('../utils', () => ({
  compressImage: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
}));

describe('Sidebar', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeTab: 'chat' as const,
    onTabChange: vi.fn(),
    onTriggerLeaf: vi.fn(),
    userName: 'TestUser',
    onUpdateProfile: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
    document.body.classList.remove('sidebar-open');
  });

  // ─── Visibility Tests ────────────────────────────────────────────

  it('should render sidebar content when isOpen is true', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('TestUser')).toBeDefined();
    expect(screen.getByText('Chat')).toBeDefined();
    expect(screen.getByText('Scrapbook')).toBeDefined();
    expect(screen.getByText('Our Pet')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('should not render sidebar content when isOpen is false', () => {
    render(<Sidebar {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('TestUser')).toBeNull();
  });

  // ─── Close Behavior Tests ────────────────────────────────────────

  it('should call onClose when close button (X) is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByTestId('sidebar-close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop overlay is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Navigation Tests ────────────────────────────────────────────

  it('should call onTabChange with correct tab ID when a nav item is clicked', () => {
    const onTabChange = vi.fn();
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onTabChange={onTabChange} onClose={onClose} />);

    const scrapbookBtn = screen.getByTestId('sidebar-nav-timeline');
    fireEvent.click(scrapbookBtn);

    expect(onTabChange).toHaveBeenCalledWith('timeline');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onTabChange for settings tab', () => {
    const onTabChange = vi.fn();
    render(<Sidebar {...defaultProps} onTabChange={onTabChange} />);

    const settingsBtn = screen.getByTestId('sidebar-nav-settings');
    fireEvent.click(settingsBtn);

    expect(onTabChange).toHaveBeenCalledWith('settings');
  });

  it('should navigate to Our Pet tab', () => {
    const onTabChange = vi.fn();
    render(<Sidebar {...defaultProps} onTabChange={onTabChange} />);

    const petBtn = screen.getByTestId('sidebar-nav-pet');
    fireEvent.click(petBtn);

    expect(onTabChange).toHaveBeenCalledWith('pet');
  });

  // ─── Leaf Button Test ────────────────────────────────────────────

  it('should call onTriggerLeaf when leaf button is clicked', () => {
    const onTriggerLeaf = vi.fn();
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onTriggerLeaf={onTriggerLeaf} onClose={onClose} />);

    const leafBtn = screen.getByTestId('sidebar-leaf-btn');
    fireEvent.click(leafBtn);

    expect(onTriggerLeaf).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── User Name Display + Edit ─────────────────────────────────────

  it('should display the user name', () => {
    render(<Sidebar {...defaultProps} userName="Alice" />);

    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should show name input when name is clicked', () => {
    render(<Sidebar {...defaultProps} />);

    const nameBtn = screen.getByTestId('sidebar-name-btn');
    fireEvent.click(nameBtn);

    expect(screen.getByTestId('sidebar-name-input')).toBeDefined();
  });

  // ─── Avatar ───────────────────────────────────────────────────────

  it('should show user initial when no avatar', () => {
    render(<Sidebar {...defaultProps} userName="Bob" />);

    expect(screen.getByText('B')).toBeDefined();
  });

  it('should have an avatar upload button', () => {
    render(<Sidebar {...defaultProps} />);

    const avatarBtn = screen.getByTestId('sidebar-avatar-btn');
    expect(avatarBtn).toBeDefined();
  });

  // ─── Pet Mini Status ──────────────────────────────────────────────

  it('should display pet mini status when petSummary is provided', () => {
    render(<Sidebar {...defaultProps} petSummary={{ name: 'Luna', hunger: 80, love: 90 }} />);

    expect(screen.getByText('🐾 Luna')).toBeDefined();
    expect(screen.getByText('🍖 80%')).toBeDefined();
    expect(screen.getByText('❤️ 90%')).toBeDefined();
  });

  it('should not display pet mini status when no pet', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.queryByText('🐾')).toBeNull();
  });

  // ─── Active Tab Styling ───────────────────────────────────────────

  it('should apply active styles to the current tab', () => {
    render(<Sidebar {...defaultProps} activeTab="timeline" />);

    const timelineBtn = screen.getByTestId('sidebar-nav-timeline');
    const chatBtn = screen.getByTestId('sidebar-nav-chat');

    expect(timelineBtn.className).toContain('sidebar-nav-active');
    expect(chatBtn.className).toContain('sidebar-nav-inactive');
  });

  // ─── Body Scroll Lock ────────────────────────────────────────────

  it('should add sidebar-open class to body when open', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);

    expect(document.body.classList.contains('sidebar-open')).toBe(true);
  });

  it('should remove sidebar-open class from body when closed', () => {
    const { rerender } = render(<Sidebar {...defaultProps} isOpen={true} />);
    expect(document.body.classList.contains('sidebar-open')).toBe(true);

    rerender(<Sidebar {...defaultProps} isOpen={false} />);
    expect(document.body.classList.contains('sidebar-open')).toBe(false);
  });
});
