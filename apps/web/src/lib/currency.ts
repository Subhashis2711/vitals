// Common currencies for the Settings picker — codes are ISO 4217, resolved
// to a symbol/format via Intl.NumberFormat rather than a hand-maintained
// symbol table.
export const CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CNY", label: "Chinese Yuan" },
] as const;

export const DEFAULT_CURRENCY = "USD";

export function currencySymbol(code: string): string {
  const part = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency");
  return part?.value ?? code;
}

export function formatMoney(amount: number, code: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}
