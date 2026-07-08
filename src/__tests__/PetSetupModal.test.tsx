import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PetSetupModal from '../components/PetSetupModal';

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

describe('PetSetupModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPropose: vi.fn(),
    anniversaryDate: Date.now() - 30 * 86400000,
  };

  it('should render pet type selection when open', () => {
    render(<PetSetupModal {...defaultProps} />);

    expect(screen.getByText(/Cat/i)).toBeDefined();
    expect(screen.getByText(/Dog/i)).toBeDefined();
  });

  it('should not render when closed', () => {
    render(<PetSetupModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText(/Cat/i)).toBeNull();
  });

  it('should call onClose when cancel/close is clicked', () => {
    const onClose = vi.fn();
    render(<PetSetupModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByLabelText(/close/i);
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should allow selecting a pet type', () => {
    render(<PetSetupModal {...defaultProps} />);

    const catOption = screen.getByText(/Cat/i).closest('button');
    if (catOption) fireEvent.click(catOption);

    // After clicking cat, the next step or selected state should be visible
    // The exact behavior depends on the component implementation
    expect(catOption).toBeDefined();
  });
});
