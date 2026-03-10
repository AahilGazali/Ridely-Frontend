/** Format amount in Indian Rupees (no decimals for whole numbers). */
export function formatINR(amount: number): string {
  const n = Math.round(amount);
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Format fare range in INR e.g. "₹120 – ₹180" */
export function formatINRRange(min: number, max: number): string {
  return `${formatINR(min)} – ${formatINR(max)}`;
}
