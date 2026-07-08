import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PetScreen from '../components/PetScreen';
import type { User, Pet, PetStatus } from '../types';
import { createDefaultPetStatus } from '../petUtils';

// Comprehensive motion/react mock covering all motion.* element types
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get(_target: Record<string, unknown>, prop: string) {
        const tag = String(prop);
        return React.forwardRef(({ children, ...props }: any, ref: any) => {
          const {
            initial, animate, exit, transition, layoutId,
            whileHover, whileTap, whileInView, whileFocus, whileDrag,
            drag, dragConstraints, dragElastic,
            variants, custom,
            ...domProps
          } = props;
          return React.createElement(tag, { ref, ...domProps }, children);
        });
      },
    },
  ),
  AnimatePresence: ({ children }: any) => children,
}));

const mockUser: User = {
  id: 'u1',
  name: 'Alice',
  seedCode: 'Green-Willow-123',
  mood: 'good',
  partnerId: 'partner1',
};

const mockPet: Pet = {
  id: 'pet1',
  type: 'cat',
  name: 'Luna',
  birthday: Date.now() - 15 * 86400000,
  createdAt: Date.now() - 15 * 86400000,
  createdBy: 'u1',
  confirmedBy: 'u2',
};

describe('PetScreen', () => {
  const baseProps = {
    user: mockUser,
    pet: null as Pet | null,
    petStatus: null as PetStatus | null,
    onSetupPet: vi.fn(),
    onPetAction: vi.fn(),
    lastUpdateTime: Date.now(),
    pendingProposal: null,
    onAcceptProposal: vi.fn(),
    onRejectProposal: vi.fn(),
  };

  it('should show adopt prompt when no pet exists', () => {
    render(<PetScreen {...baseProps} />);
    expect(screen.getByText(/Adopt a Pet/)).toBeDefined();
  });

  it('should call onSetupPet when start adoption button is clicked', () => {
    const onSetupPet = vi.fn();
    render(<PetScreen {...baseProps} onSetupPet={onSetupPet} />);

    const adoptBtn = screen.getByText('Start Adoption');
    fireEvent.click(adoptBtn);

    expect(onSetupPet).toHaveBeenCalledTimes(1);
  });

  it('should show pending proposal when one exists', () => {
    render(
      <PetScreen
        {...baseProps}
        pendingProposal={{ pet: mockPet, proposerName: 'Bob' }}
      />,
    );

    expect(screen.getByText(/Bob/)).toBeDefined();
    expect(screen.getByText('Luna')).toBeDefined();
  });

  it('should show accept and decline buttons for a proposal', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <PetScreen
        {...baseProps}
        pendingProposal={{ pet: mockPet, proposerName: 'Bob' }}
        onAcceptProposal={onAccept}
        onRejectProposal={onReject}
      />,
    );

    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Decline'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('should display pet info when pet exists', () => {
    const status = createDefaultPetStatus();
    render(
      <PetScreen
        {...baseProps}
        pet={mockPet}
        petStatus={status}
      />,
    );

    expect(screen.getByText('Luna')).toBeDefined();
  });

  it('should call onPetAction when feed is triggered', () => {
    const onPetAction = vi.fn();
    const status = createDefaultPetStatus();
    render(
      <PetScreen
        {...baseProps}
        pet={mockPet}
        petStatus={status}
        onPetAction={onPetAction}
      />,
    );

    const feedBtns = screen.getAllByRole('button');
    const feedBtn = feedBtns.find((btn) => btn.textContent?.includes('Feed'));
    if (feedBtn) fireEvent.click(feedBtn);

    expect(onPetAction).toHaveBeenCalledWith('feed');
  });
});
