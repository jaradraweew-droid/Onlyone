import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PetLiveActivity from '../components/PetLiveActivity';
import type { Pet } from '../types';
import { createDefaultPetStatus } from '../petUtils';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, layoutId, whileHover, whileTap, ...domProps } = props;
      return <div ref={ref} {...domProps}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPet: Pet = {
  id: 'pet1',
  type: 'cat',
  name: 'Luna',
  birthday: Date.now() - 15 * 86400000,
  createdAt: Date.now() - 15 * 86400000,
  createdBy: 'u1',
  confirmedBy: 'u2',
};

describe('PetLiveActivity', () => {
  const defaultProps = {
    pet: mockPet,
    status: createDefaultPetStatus(),
    onFeed: vi.fn(),
    onMissYou: vi.fn(),
    lastAction: null,
    onDismiss: vi.fn(),
  };

  it('should render the pet name in the banner', () => {
    render(<PetLiveActivity {...defaultProps} />);

    // "Luna" appears in multiple places (title + hunger text), so use getAllByText
    const matches = screen.getAllByText(/Luna/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('should show Thai title text', () => {
    render(<PetLiveActivity {...defaultProps} />);

    expect(screen.getByText(/ภารกิจดูแล/)).toBeDefined();
  });

  it('should show Thai feed button text', () => {
    render(<PetLiveActivity {...defaultProps} />);

    expect(screen.getByText(/ให้อาหาร/)).toBeDefined();
  });

  it('should show Thai miss you button text', () => {
    render(<PetLiveActivity {...defaultProps} />);

    expect(screen.getByText(/คิดถึงนะ/)).toBeDefined();
  });

  it('should show hunger bowl count', () => {
    render(<PetLiveActivity {...defaultProps} />);

    // Should show "0/6 ชาม" or similar
    expect(screen.getByText(/ชาม/)).toBeDefined();
  });

  it('should call onFeed when feed button is clicked', () => {
    const onFeed = vi.fn();
    render(<PetLiveActivity {...defaultProps} onFeed={onFeed} />);

    const feedBtn = screen.getByLabelText(/Feed pet/i);
    fireEvent.click(feedBtn);

    expect(onFeed).toHaveBeenCalledTimes(1);
  });

  it('should call onMissYou when miss you button is clicked', () => {
    const onMissYou = vi.fn();
    render(<PetLiveActivity {...defaultProps} onMissYou={onMissYou} />);

    const missBtn = screen.getByLabelText(/Miss you/i);
    fireEvent.click(missBtn);

    expect(onMissYou).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<PetLiveActivity {...defaultProps} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByLabelText(/dismiss/i);
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show partner action notification when lastAction is provided', () => {
    render(
      <PetLiveActivity
        {...defaultProps}
        lastAction={{ userName: 'Bob', type: 'feed', timestamp: Date.now() }}
      />,
    );

    expect(screen.getByText(/Bob/)).toBeDefined();
  });

  it('should render pet type emoji for cat', () => {
    render(<PetLiveActivity {...defaultProps} />);

    expect(screen.getByText('🐱')).toBeDefined();
  });
});
