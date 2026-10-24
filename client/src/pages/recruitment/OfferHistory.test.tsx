import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import { OfferHistory } from './OfferHistory';

it('shows a negotiated salary revision even when offer status stays the same', () => {
  render(<OfferHistory showSalary events={[{ id: 'revision', actionPerformed: 'OFFER_CANDIDATE', createdAt: '2026-10-24T08:00:00Z', oldValue: JSON.stringify({ offeredSalary: '50000', offerStatus: 'RELEASED' }), newValue: JSON.stringify({ offeredSalary: '55000', offerStatus: 'RELEASED' }), user: { email: 'hr@example.com' } }]} />);
  fireEvent.click(screen.getByText('Offer change history'));
  expect(screen.getByText('₹50,000')).toBeInTheDocument();
  expect(screen.getByText('₹55,000')).toBeInTheDocument();
  expect(screen.getByText('hr@example.com')).toBeInTheDocument();
});

it('hides historical salary amounts from viewers without compensation access', () => {
  render(<OfferHistory showSalary={false} events={[{ id: 'revision', actionPerformed: 'OFFER_CANDIDATE', createdAt: '2026-10-24T08:00:00Z', oldValue: '{"offeredSalary":"50000"}', newValue: '{"offeredSalary":"55000"}' }]} />);
  fireEvent.click(screen.getByText('Offer change history'));
  expect(screen.queryByText('₹50,000')).toBeNull();
  expect(screen.queryByText('₹55,000')).toBeNull();
});
