import { redactOfferHistory } from '../src/modules/recruitment/offer-history';

test('removes old and revised offer amounts without losing status and date history', () => {
  const event = { actionPerformed: 'OFFER_CANDIDATE', oldValue: JSON.stringify({ offeredSalary: '50000', offerStatus: 'RELEASED' }), newValue: JSON.stringify({ offeredSalary: '55000', joiningDate: '2026-11-01' }) };
  const [safe] = redactOfferHistory([event]);
  expect(JSON.parse(safe.oldValue)).toEqual({ offerStatus: 'RELEASED' });
  expect(JSON.parse(safe.newValue)).toEqual({ joiningDate: '2026-11-01' });
  expect(event.newValue).toContain('55000');
});
