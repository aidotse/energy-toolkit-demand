/**
 * Tests for MetricCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import MetricCard from './MetricCard.svelte';

describe('MetricCard', () => {
  it('should render with required props', () => {
    render(MetricCard, {
      props: {
        value: 42,
        label: 'Test Metric',
      },
    });

    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Test Metric')).toBeTruthy();
  });

  it('should format numbers with Swedish locale', () => {
    render(MetricCard, {
      props: {
        value: 1234567,
        label: 'Large Number',
      },
    });

    // Swedish locale uses non-breaking space as thousands separator
    const formattedNumber = screen.getByText(/1.*234.*567/);
    expect(formattedNumber).toBeTruthy();
  });

  it('should render string values as-is', () => {
    const stringValue = '100 TWh';
    render(MetricCard, {
      props: {
        value: stringValue,
        label: 'Energy',
      },
    });

    expect(screen.getByText(stringValue)).toBeTruthy();
  });

  it('should render sublabel when provided', () => {
    const sublabel = 'Additional context';
    render(MetricCard, {
      props: {
        value: 100,
        label: 'Main Label',
        sublabel,
      },
    });

    expect(screen.getByText(sublabel)).toBeTruthy();
  });

  it('should not render sublabel when not provided', () => {
    const { container } = render(MetricCard, {
      props: {
        value: 100,
        label: 'Main Label',
      },
    });

    expect(container.querySelector('.metric-sublabel')).toBeFalsy();
  });

  it('should render up trend indicator', () => {
    render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
        trend: 'up',
        trendLabel: '+15% vs last year',
      },
    });

    expect(screen.getByText(/↑/)).toBeTruthy();
    expect(screen.getByText(/\+15% vs last year/)).toBeTruthy();
  });

  it('should render down trend indicator', () => {
    render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
        trend: 'down',
        trendLabel: '-5% vs last year',
      },
    });

    expect(screen.getByText(/↓/)).toBeTruthy();
    expect(screen.getByText(/-5% vs last year/)).toBeTruthy();
  });

  it('should render neutral trend indicator', () => {
    render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
        trend: 'neutral',
        trendLabel: 'No change',
      },
    });

    expect(screen.getByText(/→/)).toBeTruthy();
    expect(screen.getByText(/No change/)).toBeTruthy();
  });

  it('should not render trend without trendLabel', () => {
    const { container } = render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
        trend: 'up',
      },
    });

    expect(container.querySelector('.metric-trend')).toBeFalsy();
  });

  it('should apply custom className', () => {
    const { container } = render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
        class: 'custom-class',
      },
    });

    const card = container.querySelector('.metric-card');
    expect(card?.classList.contains('custom-class')).toBe(true);
  });

  it('should have hover effects', () => {
    const { container } = render(MetricCard, {
      props: {
        value: 100,
        label: 'Test',
      },
    });

    const card = container.querySelector('.metric-card');
    expect(card?.classList.contains('hover:shadow-md')).toBe(true);
    expect(card?.classList.contains('hover:-translate-y-0.5')).toBe(true);
  });
});
