import { createElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountUp } from './CountUp';

describe('CountUp animation', () => {
 it('renders the animated value as one text node so digits cannot overlap', () => {
 const { container } = render(createElement(CountUp, { end: 42 }));
 const animatedValue = container.querySelector('[aria-hidden="true"]');

 expect(animatedValue?.childNodes).toHaveLength(1);
 expect(animatedValue?.firstChild?.nodeType).toBe(Node.TEXT_NODE);
 });
});
