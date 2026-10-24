/** Keep offer amounts out of audit projections for viewers without compensation access. */
export function redactOfferHistory(activity: any[]) {
  const redact = (value: string | null) => {
    if (!value) return value;
    try {
      const data = JSON.parse(value);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      delete data.offeredSalary;
      return JSON.stringify(data);
    } catch { return null; }
  };
  return activity.map(event => event.actionPerformed === 'OFFER_CANDIDATE'
    ? { ...event, oldValue: redact(event.oldValue), newValue: redact(event.newValue) }
    : event);
}
