import { createTravelSchema } from '../src/modules/travel/travel.schema';

const baseRequest = {
  travelPurpose: 'Client visit',
  destination: 'Hyderabad',
  startDate: '2026-10-20T00:00:00.000Z',
  endDate: '2026-10-21T00:00:00.000Z',
  travelMode: 'AIR' as const,
  amountRequired: 1250,
};

describe('travel request details', () => {
  it('accepts multiple travel modes and matching outbound and return amounts', () => {
    const result = createTravelSchema.safeParse({
      ...baseRequest,
      travelModes: ['AIR', 'TRAIN'],
      outboundAmountRequired: 800,
      returnAmountRequired: 450,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a total that does not match the outbound and return amounts', () => {
    const result = createTravelSchema.safeParse({
      ...baseRequest,
      travelModes: ['AIR', 'TRAIN'],
      outboundAmountRequired: 800,
      returnAmountRequired: 400,
    });

    expect(result.success).toBe(false);
  });

  it('keeps accepting existing requests with one travel mode and a single total', () => {
    expect(createTravelSchema.safeParse(baseRequest).success).toBe(true);
  });
});
