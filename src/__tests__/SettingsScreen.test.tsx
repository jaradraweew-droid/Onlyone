import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsScreen from '../components/SettingsScreen';

// Mock socket
vi.mock('../socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
  }
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

const mockUser = {
  id: 'u1',
  name: 'Alice',
  seedCode: 'Green-Willow-123',
  mood: 'good',
  partnerId: 'u2',
  customMoods: [
    { id: 'm-good', value: 'good', color: '#7A8B7D', label: 'Good' }
  ]
};

describe('SettingsScreen', () => {
  it('renders custom moods', () => {
    const onUpdateUser = vi.fn();
    render(
      <SettingsScreen 
        user={mockUser} 
        onUpdateUser={onUpdateUser} 
        notificationProps={mockNotificationProps} 
      />
    );
    expect(screen.getByText('Good')).toBeDefined();
    expect(screen.getByText('Add New')).toBeDefined();
  });

  it('opens add mood modal and saves new mood', () => {
    const onUpdateUser = vi.fn();
    render(
      <SettingsScreen 
        user={mockUser} 
        onUpdateUser={onUpdateUser} 
        notificationProps={mockNotificationProps} 
      />
    );
    
    // Click Add New
    fireEvent.click(screen.getByText('Add New'));
    expect(screen.getByText('Add New Feeling')).toBeDefined();
    
    // Fill out form
    const input = screen.getByPlaceholderText('e.g. Excited');
    fireEvent.change(input, { target: { value: 'Excited' } });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    expect(onUpdateUser).toHaveBeenCalledTimes(1);
    const updatedUser = onUpdateUser.mock.calls[0][0];
    expect(updatedUser.customMoods.length).toBe(2);
    expect(updatedUser.customMoods[1].label).toBe('Excited');
  });
});
