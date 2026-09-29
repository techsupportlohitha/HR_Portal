import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountUp } from './CountUp';

describe('CountUp', () => {
 it('exposes only the final formatted value to assistive technology', () => {
 render(<h2><CountUp end={42} prefix="₹" suffix=" total" /></h2>);

 expect(screen.getByRole('heading')).toHaveAccessibleName('₹42 total');
 });
});
