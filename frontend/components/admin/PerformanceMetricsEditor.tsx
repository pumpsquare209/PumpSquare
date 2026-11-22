"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { PerformanceMetric } from "@/lib/products";
import { newId } from "./editor-types";

const field = "w-full rounded-md border border-line px-2.5 py-2 text-sm text-ink focus:border-primary focus:outline-none";

type PerformanceMetricsRow = {
  id: string;
  metricName: string;
  metricValue: string;
  unit: string;
};

export default function PerformanceMetricsEditor({
  metrics,
  onChange,
}: {
  metrics: PerformanceMetric[];
  onChange: (metrics: PerformanceMetric[]) => void;
}) {
  const update = (index: number, patch: Partial<PerformanceMetricsRow>) =>
    onChange(
      metrics.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      )
    );

  const addMetric = () => {
    if (metrics.length >= 30) return;
    onChange([
      ...metrics,
      { id: newId(), productId: "", metricName: "", metricValue: "", unit: "", displayOrder: metrics.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
  };

  const removeMetric = (index: number) => {
    onChange(metrics.filter((_, i) => i !== index).map((row, i) => ({ ...row, displayOrder: i })));
  };

  const moveMetric = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= metrics.length) return;
    const next = [...metrics];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((row, i) => ({ ...row, displayOrder: i })));
  };

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-bold text-primary-deep">Performance Metrics</h2>
      <p className="mt-1 text-xs text-muted">
        Add the important performance parameters and their corresponding values for this product.
      </p>

      <div className="mt-4 hidden gap-2 text-[11px] font-semibold text-muted sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
        <span>Metric Name</span>
        <span>Value</span>
        <span>Unit (optional)</span>
        <span />
      </div>

      <div className="mt-1 space-y-2">
        {metrics.length === 0 ? (
          <p className="text-xs text-muted">No performance metrics added yet. Click Add Metric to begin.</p>
        ) : null}
        {metrics.map((row, index) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              aria-label={`Metric Name ${index + 1}`}
              value={row.metricName}
              onChange={(event) => update(index, { metricName: event.target.value })}
              placeholder="e.g. RPM"
              maxLength={80}
              className={field}
            />
            <input
              aria-label={`Value ${index + 1}`}
              value={row.metricValue}
              onChange={(event) => update(index, { metricValue: event.target.value })}
              placeholder="e.g. 1450"
              maxLength={80}
              className={field}
            />
            <input
              aria-label={`Unit ${index + 1}`}
              value={row.unit ?? ""}
              onChange={(event) => update(index, { unit: event.target.value })}
              placeholder="Optional (e.g. RPM)"
              maxLength={80}
              className={field}
            />
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => moveMetric(index, -1)}
                disabled={index === 0}
                className="rounded p-1.5 text-muted hover:text-primary disabled:opacity-30"
                aria-label={`Move metric ${index + 1} up`}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => moveMetric(index, 1)}
                disabled={index === metrics.length - 1}
                className="rounded p-1.5 text-muted hover:text-primary disabled:opacity-30"
                aria-label={`Move metric ${index + 1} down`}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => removeMetric(index)}
                className="rounded p-1.5 text-muted hover:text-red-600"
                aria-label={`Remove metric ${index + 1}`}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={metrics.length >= 30}
        onClick={addMetric}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add Metric
      </button>
    </section>
  );
}