import { BuiltSeries } from "./seriesBuilder";
import { formatTimestamp } from "./dateFormat";

export interface TimelineConfig {
    autoPlay: boolean;
    loop: boolean;
    playInterval: number;
    rewind: boolean;
    dateFormat?: string;
}

/**
 * Builds an ECharts timeline option object ({ baseOption, options[] })
 * from the built series when a timeline attribute is configured.
 *
 * Series without a timelineSteps array are "constant" — their full data
 * is included in every timeline step unchanged.
 */
export function buildTimelineOption(
    baseEChartsOption: object,
    series: BuiltSeries[],
    config: TimelineConfig
): object {
    // Collect the ordered union of all timeline step keys
    const stepKeyOrder = collectStepKeys(series);

    if (stepKeyOrder.length === 0) {
        // No timeline data found — return base option unchanged
        return baseEChartsOption;
    }

    // Build step labels (format dates if needed)
    const stepLabels = stepKeyOrder.map(key => formatStepKey(key, series, config.dateFormat));

    // For each step, build a partial option overriding series data
    const options = stepKeyOrder.map(key => {
        const stepSeries = series.map(s => {
            if (!s.timelineSteps) {
                // Constant series — data unchanged for every step
                return { data: s.data };
            }
            const step = s.timelineSteps.find(t => t.key === key);
            return { data: step ? step.data : [] };
        });
        return { series: stepSeries };
    });

    const base = baseEChartsOption as Record<string, unknown>;

    // Increase grid bottom to make room for the timeline bar (~80px)
    const existingGrid = (base.grid as Record<string, unknown>) ?? {};
    const currentBottom = typeof existingGrid.bottom === "number" ? existingGrid.bottom : 30;
    const updatedGrid = { ...existingGrid, bottom: currentBottom + 80 };

    // For category X axis: collect unique X values across ALL timeline steps so
    // labels are deduplicated and consistent between steps
    const xIsDateTime = series.some(s => s.xIsDateTime);
    let updatedXAxis = base.xAxis as Record<string, unknown> | undefined;
    if (!xIsDateTime && updatedXAxis) {
        const allX = new Set<string>();
        series.forEach(s => {
            if (s.timelineSteps) {
                s.timelineSteps.forEach(step => step.data.forEach(([x]) => allX.add(String(x))));
            } else {
                s.data.forEach(([x]) => allX.add(String(x)));
            }
        });
        updatedXAxis = { ...updatedXAxis, data: Array.from(allX).sort() };
    }

    return {
        baseOption: {
            ...base,
            grid: updatedGrid,
            ...(updatedXAxis ? { xAxis: updatedXAxis } : {}),
            timeline: {
                axisType: "category",
                data: stepLabels,
                autoPlay: config.autoPlay,
                loop: config.loop,
                playInterval: config.playInterval,
                rewind: config.rewind,
                // Padding so the first/last step labels aren't clipped at the edges
                left: "5%",
                right: "5%",
                label: {
                    formatter: (value: string) => value
                }
            }
        },
        options
    };
}

/**
 * Collects all unique timeline step keys in their natural sort order.
 * Only considers series that have timelineSteps defined.
 */
function collectStepKeys(series: BuiltSeries[]): string[] {
    const seen = new Map<string, number | string>(); // key → sortValue

    for (const s of series) {
        if (!s.timelineSteps) continue;
        for (const step of s.timelineSteps) {
            if (!seen.has(step.key)) {
                seen.set(step.key, step.sortValue);
            }
        }
    }

    return Array.from(seen.entries())
        .sort(([, a], [, b]) => {
            if (typeof a === "number" && typeof b === "number") return a - b;
            return String(a) < String(b) ? -1 : 1;
        })
        .map(([key]) => key);
}

/**
 * Converts a raw step key back to a display label.
 * If the key is a numeric timestamp, format it as a date.
 */
function formatStepKey(key: string, series: BuiltSeries[], dateFormat?: string): string {
    // Detect if this key represents a timestamp (only numeric keys from Date values)
    const hasDateTimeline = series.some(
        s => s.timelineSteps?.some(t => t.key === key && typeof t.sortValue === "number")
    );

    if (hasDateTimeline) {
        const ts = Number(key);
        if (!isNaN(ts)) {
            return dateFormat ? formatTimestamp(ts, dateFormat) : new Date(ts).toLocaleDateString();
        }
    }

    return key;
}
