import { ReactElement, useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart as EChartsBarChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    TimelineComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkAreaComponent,
    MarkPointComponent,
    ToolboxComponent,
    BrushComponent,
    VisualMapComponent,
    PolarComponent,
    DatasetComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, BarSeriesOption } from "echarts";
import { BuiltSeries } from "../utils/seriesBuilder";
import { buildTimelineOption, TimelineConfig } from "../utils/timelineBuilder";
import { formatTimestamp } from "../utils/dateFormat";

echarts.use([EChartsBarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, TimelineComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, ToolboxComponent, BrushComponent, VisualMapComponent, PolarComponent, DatasetComponent, CanvasRenderer]);

export interface BarChartProps {
    series: BuiltSeries[];
    categoryAxisLabel: string;
    valueAxisLabel: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    gridLines: "none" | "horizontal" | "vertical" | "both";
    horizontal: boolean;
    stack: boolean;
    barWidth?: string;
    xAxisDateFormat?: string;
    backgroundColor?: string;
    timelineConfig?: TimelineConfig;
    customOption?: string;
    customInitOptions?: string;
    onDataPointClick?: (seriesIndex: number, dataIndex: number) => void;
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source)) {
        const srcVal = (source as Record<string, unknown>)[key];
        const tgtVal = result[key];
        if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) &&
            tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)) {
            result[key] = deepMerge(tgtVal as object, srcVal as object);
        } else if (srcVal !== undefined) {
            result[key] = srcVal;
        }
    }
    return result as T;
}

/**
 * Converts a raw x value to the string label used on the category axis.
 * When the series uses DateTime x values the label is formatted with the
 * supplied date-format string (or falls back to the locale date string).
 */
function formatCategory(x: string | number, xIsDateTime: boolean, dateFormat?: string): string {
    if (xIsDateTime && typeof x === "number") {
        return dateFormat ? formatTimestamp(x, dateFormat) : new Date(x).toLocaleDateString();
    }
    return String(x);
}

/**
 * Collects all unique category labels across all series.
 * DateTime values are sorted chronologically; other values lexicographically.
 */
function collectCategories(series: BuiltSeries[], dateFormat?: string): string[] {
    const xIsDateTime = series.some(s => s.xIsDateTime);
    if (xIsDateTime) {
        const timestamps = new Set<number>();
        series.forEach(s => s.data.forEach(([x]) => { if (typeof x === "number") timestamps.add(x); }));
        return Array.from(timestamps)
            .sort((a, b) => a - b)
            .map(ts => formatCategory(ts, true, dateFormat));
    }
    const all = new Set<string>();
    series.forEach(s => s.data.forEach(([x]) => all.add(String(x))));
    return Array.from(all).sort();
}

/**
 * Maps series data to a positional array aligned with the categories array.
 * Used when no colorDim is present.
 */
function toPositionalData(s: BuiltSeries, categories: string[], xIsDateTime: boolean, dateFormat?: string): Array<number | null> {
    const map = new Map<string, number>();
    s.data.forEach(point => {
        map.set(formatCategory(point[0], xIsDateTime, dateFormat), point[1]);
    });
    return categories.map(cat => map.get(cat) ?? null);
}

/**
 * Maps tooltip strings to positional order matching the categories array.
 * Necessary because s.tooltips is in original data order while p.dataIndex
 * from ECharts refers to the category-sorted position.
 */
function toPositionalTooltips(s: BuiltSeries, categories: string[], xIsDateTime: boolean, dateFormat?: string): string[] {
    const map = new Map<string, string>();
    s.data.forEach(([x], i) => map.set(formatCategory(x, xIsDateTime, dateFormat), s.tooltips[i] ?? ""));
    return categories.map(cat => map.get(cat) ?? "");
}

/**
 * Builds a Map from positional index (category order) → original data index.
 * Used by the click handler to look up onClickItems in their original order.
 */
function buildPosToOrigMap(s: BuiltSeries, categories: string[], xIsDateTime: boolean, dateFormat?: string): Map<number, number> {
    const map = new Map<number, number>();
    categories.forEach((cat, posIdx) => {
        const origIdx = s.data.findIndex(([x]) => formatCategory(x, xIsDateTime, dateFormat) === cat);
        if (origIdx >= 0) map.set(posIdx, origIdx);
    });
    return map;
}

function buildLegend(show: boolean, position: string) {
    const vertical = position === "left" || position === "right";
    const base = { show, type: "scroll" as const, orient: vertical ? "vertical" as const : "horizontal" as const };
    if (position === "bottom") return { ...base, bottom: 0, left: "center" as const };
    if (position === "left")   return { ...base, left: "left" as const, top: "middle" as const };
    if (position === "right")  return { ...base, right: 0, top: "middle" as const };
    return { ...base, top: "top" as const, left: "center" as const };
}

function buildEChartsOption(props: BarChartProps): EChartsOption {
    const { series, categoryAxisLabel, valueAxisLabel, showLegend, legendPosition, gridLines, horizontal, stack, barWidth, xAxisDateFormat, backgroundColor } = props;

    const xIsDateTime = series.some(s => s.xIsDateTime);
    const categories = collectCategories(series, xAxisDateFormat);
    const showCatGrid = gridLines === "vertical" || gridLines === "both";
    const showValGrid = gridLines === "horizontal" || gridLines === "both";

    // When any series has a colorDim, use ECharts dataset so that visualMap
    // can reference the colorDim by name/index without conflicting with bar length.
    const anyColorDim = series.some(s => s.data.some(p => p.length === 3));

    // datasets[i] corresponds to series[i] when anyColorDim is true.
    const datasets: Array<{ dimensions: string[]; source: Array<[string, number | null, number | null]> }> = [];

    const eChartsSeries: BarSeriesOption[] = series.map((s, index) => {
        const positionalTooltips = toPositionalTooltips(s, categories, xIsDateTime, xAxisDateFormat);
        const hasTooltips = positionalTooltips.some(t => t);

        const tooltipFormatter = hasTooltips
            ? (params: unknown) => {
                  const p = params as { dataIndex: number; seriesName: string; value: unknown };
                  const tooltip = positionalTooltips[p.dataIndex];
                  // With dataset, params.value is the full row array; extract the "value" column (index 1).
                  const displayVal = anyColorDim && Array.isArray(p.value)
                      ? (p.value as unknown[])[1]
                      : p.value;
                  return tooltip || `${p.seriesName}: ${displayVal ?? "-"}`;
              }
            : undefined;

        let baseSeries: BarSeriesOption;

        if (anyColorDim) {
            // Build a dataset for this series: dimensions = [category, value, colorDim]
            const dataMap = new Map<string, { value: number; colorDim: number | null }>();
            s.data.forEach(point => {
                const cat = formatCategory(point[0], xIsDateTime, xAxisDateFormat);
                dataMap.set(cat, {
                    value: point[1],
                    colorDim: point.length === 3 ? (point as [string | number, number, number])[2] : null
                });
            });

            const source: Array<[string, number | null, number | null]> = categories.map(cat => {
                const entry = dataMap.get(cat);
                return [cat, entry?.value ?? null, entry?.colorDim ?? null];
            });

            const datasetIndex = datasets.length;
            datasets.push({ dimensions: ["category", "value", "colorDim"], source });

            baseSeries = {
                name: s.name,
                type: "bar",
                stack: stack ? "total" : undefined,
                barWidth: barWidth || undefined,
                datasetIndex,
                encode: horizontal
                    ? { x: "value", y: "category" }
                    : { y: "value", x: "category" },
                itemStyle: { color: s.lineColor ?? undefined },
                tooltip: { formatter: tooltipFormatter }
            };
        } else {
            const data = toPositionalData(s, categories, xIsDateTime, xAxisDateFormat);
            baseSeries = {
                name: s.name,
                type: "bar",
                stack: stack ? "total" : undefined,
                barWidth: barWidth || undefined,
                data,
                itemStyle: { color: s.lineColor ?? undefined },
                tooltip: { formatter: tooltipFormatter }
            };
        }

        if (s.customSeriesOptions) {
            try {
                const custom = JSON.parse(s.customSeriesOptions);
                return deepMerge(baseSeries, custom) as BarSeriesOption;
            } catch {
                console.warn(`[EChartsBarChart] Series ${index}: invalid customSeriesOptions JSON`);
            }
        }

        return baseSeries;
    });

    // When using dataset, the category axis derives its labels from the dataset;
    // supplying axis.data as well would cause duplicates / ordering conflicts.
    const catAxisData = anyColorDim ? undefined : categories;

    const option: EChartsOption = horizontal
        ? {
              backgroundColor: backgroundColor || "transparent",
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
              legend: buildLegend(showLegend, legendPosition),
              grid: { left: legendPosition === "left" ? "20%" : "3%", right: legendPosition === "right" ? "20%" : "4%", bottom: categoryAxisLabel ? 60 : 30, containLabel: true },
              xAxis: {
                  type: "value",
                  scale: true,
                  name: valueAxisLabel || undefined,
                  nameLocation: "middle",
                  nameGap: 30,
                  splitLine: { show: showValGrid }
              },
              yAxis: {
                  type: "category",
                  data: catAxisData,
                  name: categoryAxisLabel || undefined,
                  nameLocation: "middle",
                  nameGap: 60,
                  splitLine: { show: showCatGrid }
              },
              series: eChartsSeries
          }
        : {
              backgroundColor: backgroundColor || "transparent",
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
              legend: buildLegend(showLegend, legendPosition),
              grid: { left: legendPosition === "left" ? "20%" : "3%", right: legendPosition === "right" ? "20%" : "4%", bottom: categoryAxisLabel ? 60 : 30, containLabel: true },
              xAxis: {
                  type: "category",
                  data: catAxisData,
                  name: categoryAxisLabel || undefined,
                  nameLocation: "middle",
                  nameGap: 30,
                  splitLine: { show: showCatGrid }
              },
              yAxis: {
                  type: "value",
                  scale: true,
                  name: valueAxisLabel || undefined,
                  nameLocation: "middle",
                  nameGap: 40,
                  splitLine: { show: showValGrid }
              },
              series: eChartsSeries
          };

    if (anyColorDim) {
        (option as Record<string, unknown>).dataset = datasets;
    }

    if (props.customOption) {
        try {
            return deepMerge(option, JSON.parse(props.customOption));
        } catch {
            console.warn("[EChartsBarChart] Invalid customOption JSON");
        }
    }

    return option;
}

export function BarChart(props: BarChartProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);
    // Per-series map from positional (category-sorted) index → original data index.
    // Kept in a ref so the click handler always sees the latest mapping without
    // needing to be re-registered on every render.
    const posToOrigRef = useRef<Map<number, number>[]>([]);

    // Initialize chart on mount
    useEffect(() => {
        if (!containerRef.current) return;
        let initOpts: object = {};
        if (props.customInitOptions) {
            try { initOpts = JSON.parse(props.customInitOptions); } catch { /* ignore */ }
        }
        chartRef.current = echarts.init(containerRef.current, undefined, { renderer: "canvas", ...initOpts });
        return () => {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update option on every render
    useEffect(() => {
        if (!chartRef.current) return;

        // Keep click-handler mapping in sync with the current data.
        const xIsDateTime = props.series.some(s => s.xIsDateTime);
        const categories = collectCategories(props.series, props.xAxisDateFormat);
        posToOrigRef.current = props.series.map(s =>
            buildPosToOrigMap(s, categories, xIsDateTime, props.xAxisDateFormat)
        );

        const baseOption = buildEChartsOption(props);
        const hasTimeline = props.timelineConfig && props.series.some(s => s.timelineSteps?.length);
        const option = hasTimeline
            ? buildTimelineOption(baseOption, props.series, props.timelineConfig!)
            : baseOption;
        chartRef.current.setOption(option as EChartsOption, { notMerge: true });
    });

    // Click handler
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !props.onDataPointClick) return;
        const handler = (params: unknown) => {
            const p = params as { seriesIndex: number; dataIndex: number };
            // Translate ECharts' category-sorted dataIndex back to the original
            // data-order index so onClickItems lookup in the container is correct.
            const origIdx = posToOrigRef.current[p.seriesIndex]?.get(p.dataIndex) ?? p.dataIndex;
            props.onDataPointClick!(p.seriesIndex, origIdx);
        };
        chart.on("click", handler);
        return () => { chart.off("click", handler); };
    }, [props.onDataPointClick]);

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => { chartRef.current?.resize(); });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            className="widget-echarts-inner"
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
        />
    );
}
