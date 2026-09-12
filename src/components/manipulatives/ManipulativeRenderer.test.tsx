import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManipulativeRenderer } from './ManipulativeRenderer';

describe('ManipulativeRenderer', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  afterEach(cleanup);
  it('renders a number line and emits interactions', () => {
    const onInteraction = vi.fn();
    render(<ManipulativeRenderer config={{ kind: 'number_line', min: 0, max: 10, value: 5 }} onInteraction={onInteraction} />);
    expect(screen.getByLabelText('Number line')).toBeTruthy();
  });

  it('adds and removes counters', () => {
    const onInteraction = vi.fn();
    render(<ManipulativeRenderer config={{ kind: 'counters', count: 2, max: 5 }} onInteraction={onInteraction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add counter' }));
    expect(onInteraction).toHaveBeenCalledWith(expect.objectContaining({ kind: 'counters', value: 3 }));
  });

  it('builds multiplication arrays', () => {
    render(<ManipulativeRenderer config={{ kind: 'array', rows: 3, columns: 4 }} />);
    expect(screen.getByLabelText('3 by 4 array')).toBeTruthy();
    expect(screen.getByText('3 × 4 = 12')).toBeTruthy();
  });

  it('renders interactive fraction bars', () => {
    render(<ManipulativeRenderer config={{ kind: 'fraction_bar', numerator: 1, denominator: 4 }} />);
    expect(screen.getByLabelText('1 of 4 parts')).toBeTruthy();
  });

  it('renders place value, balance, and geometry tools', () => {
    const { rerender } = render(<ManipulativeRenderer config={{ kind: 'place_value', value: 123 }} />);
    expect(screen.getByText('Hundreds')).toBeTruthy();
    rerender(<ManipulativeRenderer config={{ kind: 'balance_scale', left: 2, right: 2 }} />);
    expect(screen.getByText('=')).toBeTruthy();
    rerender(<ManipulativeRenderer config={{ kind: 'geometry_canvas', shape: 'rectangle', width: 4, height: 3 }} />);
    expect(screen.getByRole('img', { name: 'rectangle geometry canvas' })).toBeTruthy();
  });

  it('clamps counter, fraction, and place-value boundaries', () => {
    const onInteraction = vi.fn();
    const { rerender } = render(<ManipulativeRenderer config={{ kind: 'counters', count: 0, max: 1 }} onInteraction={onInteraction} />);
    expect(screen.getByRole('button', { name: 'Remove counter' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Add counter' }));
    expect(onInteraction).toHaveBeenLastCalledWith(expect.objectContaining({ value: 1 }));
    rerender(<ManipulativeRenderer config={{ kind: 'fraction_bar', numerator: 9, denominator: 4 }} />);
    expect(screen.getByLabelText('4 of 4 parts')).toBeTruthy();
    rerender(<ManipulativeRenderer config={{ kind: 'place_value', value: 10, maxValue: 10 }} />);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('keeps squares square and supports read-only mode', () => {
    const onInteraction = vi.fn();
    render(<ManipulativeRenderer config={{ kind: 'geometry_canvas', shape: 'square', width: 4, height: 8 }} readOnly onInteraction={onInteraction} />);
    expect(screen.getAllByRole('slider')[0].hasAttribute('data-disabled')).toBe(true);
    expect(screen.getAllByRole('slider')[1].hasAttribute('data-disabled')).toBe(true);
    expect(onInteraction).not.toHaveBeenCalled();
  });
});
