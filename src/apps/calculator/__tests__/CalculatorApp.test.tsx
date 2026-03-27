import { describe, it, expect } from 'vitest';
import { renderWithTheme, screen, fireEvent } from '@/test/testUtils';
import CalculatorApp from '../CalculatorApp';

describe('CalculatorApp', () => {
  it('renders with display showing 0', () => {
    renderWithTheme(<CalculatorApp />);
    // "0" appears both as a button and in the display
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it('inputs digits and updates display', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('3'));
    // The display should show "53" — it's in the text-3xl element
    // Since there are also button labels "5" and "3", we need to be more specific
    // The display is the only element with text-3xl
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('53');
  });

  it('performs addition', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('='));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('5');
  });

  it('performs subtraction', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('-'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('='));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('5');
  });

  it('performs multiplication', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('*'));
    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByText('='));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('21');
  });

  it('performs division', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('8'));
    fireEvent.click(screen.getByText('/'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('='));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('4');
  });

  it('handles division by zero', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('/'));
    fireEvent.click(screen.getByText('0'));
    fireEvent.click(screen.getByText('='));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('Error');
  });

  it('clears display with C button', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('C'));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('0');
  });

  it('handles decimal point', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('.'));
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('4'));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('3.14');
  });

  it('negates the current value', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('+/-'));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('-5');
  });

  it('does not negate zero', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('+/-'));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('0');
  });

  it('handles backspace correctly', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('3'));
    // Find the backspace button by its Unicode label
    fireEvent.click(screen.getByText('\u232B'));
    const display = document.querySelector('.text-3xl');
    expect(display?.textContent).toBe('5');
  });

  it('shows operation in the secondary display', () => {
    renderWithTheme(<CalculatorApp />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('+'));
    const secondary = document.querySelector('.min-h-\\[1\\.25rem\\]');
    expect(secondary?.textContent).toContain('5');
    expect(secondary?.textContent).toContain('+');
  });
});
