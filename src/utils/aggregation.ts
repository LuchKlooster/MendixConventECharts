import { AggregationTypeEnum } from "../../typings/EChartsLineChartProps";

export interface DataPoint {
    x: string | number;
    y: number;
    tooltip?: string;
}

function aggregateValues(values: number[], type: AggregationTypeEnum): number {
    if (values.length === 0) return 0;
    switch (type) {
        case "count":
            return values.length;
        case "sum":
            return values.reduce((a, b) => a + b, 0);
        case "avg":
            return values.reduce((a, b) => a + b, 0) / values.length;
        case "min":
            return Math.min(...values);
        case "max":
            return Math.max(...values);
        case "median": {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }
        case "mode": {
            const freq: Record<number, number> = {};
            values.forEach(v => (freq[v] = (freq[v] ?? 0) + 1));
            return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
        }
        case "first":
            return values[0];
        case "last":
            return values[values.length - 1];
        default:
            return values[0];
    }
}

export function aggregateDataPoints(points: DataPoint[], type: AggregationTypeEnum): DataPoint[] {
    if (type === "none") return points;

    const grouped = new Map<string | number, { ys: number[]; tooltip?: string }>();
    for (const { x, y, tooltip } of points) {
        if (!grouped.has(x)) {
            grouped.set(x, { ys: [], tooltip });
        }
        grouped.get(x)!.ys.push(y);
    }

    return Array.from(grouped.entries()).map(([x, { ys, tooltip }]) => ({
        x,
        y: aggregateValues(ys, type),
        tooltip
    }));
}
