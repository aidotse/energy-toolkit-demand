/**
 * Tests for LoadingSkeleton component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import LoadingSkeleton from './LoadingSkeleton.svelte';

describe('LoadingSkeleton', () => {
  it('should render with default variant (chart)', () => {
    const { container } = render(LoadingSkeleton);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('should render chart variant', () => {
    const { container } = render(LoadingSkeleton, {
      props: { variant: 'chart' },
    });
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should render map variant', () => {
    const { container } = render(LoadingSkeleton, {
      props: { variant: 'map' },
    });
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should render table variant', () => {
    const { container } = render(LoadingSkeleton, {
      props: { variant: 'table' },
    });
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should render text variant', () => {
    const { container } = render(LoadingSkeleton, {
      props: { variant: 'text' },
    });
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should display custom message', () => {
    const customMessage = 'Loading custom data...';
    render(LoadingSkeleton, {
      props: { message: customMessage },
    });
    expect(screen.getByText(customMessage)).toBeTruthy();
  });

  it('should apply custom className', () => {
    const { container } = render(LoadingSkeleton, {
      props: { class: 'custom-class' },
    });
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton?.classList.contains('custom-class')).toBe(true);
  });

  it('should have accessible role and aria-live attribute', () => {
    const { container } = render(LoadingSkeleton);
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute('aria-live')).toBe('polite');
  });
});
