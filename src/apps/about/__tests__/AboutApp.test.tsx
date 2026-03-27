import { describe, it, expect } from 'vitest';
import { renderWithTheme, screen } from '@/test/testUtils';
import AboutApp from '../AboutApp';

describe('AboutApp', () => {
  it('renders the WebOS title', () => {
    renderWithTheme(<AboutApp />);
    expect(screen.getByText('WebOS')).toBeInTheDocument();
  });

  it('renders the version number', () => {
    renderWithTheme(<AboutApp />);
    expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderWithTheme(<AboutApp />);
    expect(screen.getByText(/programmable.*multimodal/i)).toBeInTheDocument();
  });

  it('renders tech stack badges', () => {
    renderWithTheme(<AboutApp />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Vite')).toBeInTheDocument();
    expect(screen.getByText('Tailwind CSS')).toBeInTheDocument();
  });

  it('renders the GitHub link', () => {
    renderWithTheme(<AboutApp />);
    const link = screen.getByText('GitHub');
    expect(link).toHaveAttribute('href', 'https://github.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the logo', () => {
    renderWithTheme(<AboutApp />);
    expect(screen.getByText('W')).toBeInTheDocument();
  });
});
