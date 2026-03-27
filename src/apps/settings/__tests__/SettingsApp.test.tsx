import { describe, it, expect } from 'vitest';
import { renderWithTheme, screen, fireEvent } from '@/test/testUtils';
import SettingsApp from '../SettingsApp';

describe('SettingsApp', () => {
  it('renders the Settings title', () => {
    renderWithTheme(<SettingsApp />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders sidebar navigation sections', () => {
    renderWithTheme(<SettingsApp />);
    // "Appearance", "Display", "About" appear in both nav and content
    expect(screen.getAllByText('Appearance').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Display').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('About').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Appearance section by default', () => {
    renderWithTheme(<SettingsApp />);
    // The Appearance heading should be visible
    expect(screen.getAllByText('Appearance').length).toBeGreaterThanOrEqual(2);
  });

  it('switches to Display section on click', () => {
    renderWithTheme(<SettingsApp />);
    // Click the Display nav item (not the heading)
    const navButtons = screen.getAllByText('Display');
    fireEvent.click(navButtons[0]);
    expect(screen.getByText('Wallpaper')).toBeInTheDocument();
  });

  it('switches to About section on click', () => {
    renderWithTheme(<SettingsApp />);
    const navButtons = screen.getAllByText('About');
    fireEvent.click(navButtons[0]);
    expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
  });

  it('renders theme options', () => {
    renderWithTheme(<SettingsApp />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders accent color buttons', () => {
    renderWithTheme(<SettingsApp />);
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Purple')).toBeInTheDocument();
    expect(screen.getByTitle('Green')).toBeInTheDocument();
    expect(screen.getByTitle('Orange')).toBeInTheDocument();
    expect(screen.getByTitle('Red')).toBeInTheDocument();
  });
});
