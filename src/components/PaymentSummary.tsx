"use client";

import { formatINR } from "@/lib/formatCurrency";

interface LineItem {
  label: string;
  amount: number;
}

interface PaymentSummaryProps {
  items: LineItem[];
  total: number;
  className?: string;
}

/**
 * Fare breakdown: base fare, distance, time, total.
 */
export function PaymentSummary({
  items,
  total,
  className = "",
}: PaymentSummaryProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50/50 p-4 ${className}`}>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex justify-between text-sm text-gray-600"
          >
            <span>{item.label}</span>
            <span>{formatINR(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-semibold text-black">
        <span>Total</span>
        <span>{formatINR(total)}</span>
      </div>
    </div>
  );
}
