type PeriodItem = { price?: { id?: string } | null };
type PeriodField = 'current_period_start' | 'current_period_end';
type PlanItem = (items: PeriodItem[]) => PeriodItem | undefined;

// Typed like the removed field, which was also absent at runtime when Stripe omitted it.
function subscriptionPeriod(subscription: object, field: PeriodField, planItem?: PlanItem): number {
  const legacy: unknown = Reflect.get(subscription, field);
  if (typeof legacy === 'number') return legacy;
  const list: unknown = Reflect.get(subscription, 'items');
  const data: unknown = list && typeof list === 'object' ? Reflect.get(list, 'data') : undefined;
  const items = (Array.isArray(data) ? data : []).filter(
    (item): item is PeriodItem => typeof item === 'object' && item !== null,
  );
  const periods = new Set(items.map((item) => Reflect.get(item, field)));
  const chosen = periods.size === 1 ? items[0] : planItem?.(items);
  const value: unknown = chosen ? Reflect.get(chosen, field) : undefined;
  return (typeof value === 'number' ? value : undefined) as number;
}

export function getSubscriptionPeriodEnd(subscription: object, planItem?: PlanItem): number {
  return subscriptionPeriod(subscription, 'current_period_end', planItem);
}

// The old Price object's ID when present (old-version payloads), otherwise the price at
// pricing.price_details: an ID, or a Price when expanded.
export function getInvoicePriceId(line: object): string | undefined {
  const legacy: unknown = Reflect.get(line, 'price');
  const pricing: unknown = legacy === undefined ? Reflect.get(line, 'pricing') : undefined;
  const details: unknown =
    pricing && typeof pricing === 'object' && Reflect.get(pricing, 'type') === 'price_details'
      ? Reflect.get(pricing, 'price_details')
      : undefined;
  const price: unknown =
    legacy !== undefined ? legacy : details && typeof details === 'object' ? Reflect.get(details, 'price') : undefined;
  const id: unknown = price && typeof price === 'object' ? Reflect.get(price, 'id') : price;
  return typeof id === 'string' ? id : undefined;
}
