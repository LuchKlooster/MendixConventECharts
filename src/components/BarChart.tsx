import { ReactElement, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart as EChartsBarChart, LineChart as EChartsLineChart, CustomChart } from "echarts/charts";
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
import { registerEnhancedDarkTheme } from "../utils/darkTheme";
import { barRangeInstaller } from "../utils/barRange";

echarts.use([EChartsBarChart, EChartsLineChart, CustomChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, TimelineComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, ToolboxComponent, BrushComponent, VisualMapComponent, PolarComponent, DatasetComponent, CanvasRenderer]);
echarts.use(barRangeInstaller);
registerEnhancedDarkTheme(echarts);

export interface BarChartProps {
    series: BuiltSeries[];
    categoryAxisLabel: string;
    valueAxisLabel: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    showToolbox: boolean;
    gridLines: "none" | "horizontal" | "vertical" | "both";
    horizontal: boolean;
    rangeChart?: boolean;
    stack: boolean;
    barWidth?: string;
    xAxisDateFormat?: string;
    backgroundColor?: string;
    timelineConfig?: TimelineConfig;
    themeName?: string;
    darkMode?: boolean;
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
        } else if (Array.isArray(srcVal) && srcVal.length === 1 && srcVal[0] && typeof srcVal[0] === "object" &&
                   tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)) {
            result[key] = deepMerge(tgtVal as object, srcVal[0] as object);
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

function buildRangeChartOption(props: BarChartProps): EChartsOption {
    const { series, categoryAxisLabel, valueAxisLabel, showLegend, legendPosition, showToolbox,
            gridLines, horizontal, barWidth, xAxisDateFormat, backgroundColor, darkMode } = props;

    const maxSeries = series[0];
    const minSeries = series[1];
    if (!maxSeries || !minSeries) return {} as EChartsOption;

    // Collect categories from all series so additional line series are aligned too
    const xIsDateTime = series.some(s => s.xIsDateTime);
    const categories = collectCategories(series, xAxisDateFormat);

    // Build range data: [categoryIndex, lowerBound, upperBound]
    const maxMap = new Map<string, number>();
    maxSeries.data.forEach(([x, y]) => {
        maxMap.set(formatCategory(x, xIsDateTime, xAxisDateFormat), y as number);
    });
    const minMap = new Map<string, number>();
    minSeries.data.forEach(([x, y]) => {
        minMap.set(formatCategory(x, xIsDateTime, xAxisDateFormat), y as number);
    });
    const rangeData = categories.map((cat, idx) => [idx, minMap.get(cat) ?? 0, maxMap.get(cat) ?? 0]);

    const seriesName = maxSeries.name || minSeries.name || "Range";
    const itemColor = maxSeries.lineColor ?? undefined;
    const customSeriesOpts: Record<string, unknown> = {};
    if (maxSeries.customSeriesOptions) {
        try { Object.assign(customSeriesOpts, JSON.parse(maxSeries.customSeriesOptions)); } catch { /* ignore */ }
    }
    const extraItemPayload = (customSeriesOpts.itemPayload as Record<string, unknown> | undefined) ?? {};
    // The barRange renderItem draws its value labels itself and can't read the
    // theme, so set a readable colour per mode plus an opposite-luminance halo
    // so the labels also survive landing on a coloured bar. Anything in the
    // series' customSeriesOptions.itemPayload still overrides this.
    const itemPayload = {
        ...(barWidth ? { barWidth } : {}),
        labelColor: darkMode ? "#F4F4F6" : "#1F1F1F",
        labelStrokeColor: darkMode ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
        labelStrokeWidth: 3,
        ...extraItemPayload
    };

    const rangeSeries = {
        ...customSeriesOpts,
        type: "custom",
        name: seriesName,
        renderItem: "barRange",
        data: rangeData,
        itemStyle: itemColor ? { color: itemColor } : undefined,
        itemPayload,
        encode: horizontal
            ? { y: 0, x: [1, 2], tooltip: [1, 2] }
            : { x: 0, y: [1, 2], tooltip: [1, 2] }
    };

    // Series 3+ are rendered as regular line or bar series on the same axes
    const additionalSeries = series.slice(2).map(s => {
        const data = toPositionalData(s, categories, xIsDateTime, xAxisDateFormat);
        const unit = s.unit ? ` ${s.unit}` : "";
        const baseSeries: Record<string, unknown> = {
            name: s.name,
            type: s.seriesType === "bar" ? "bar" : "line",
            data,
            yAxisIndex: s.yAxisIndex || undefined,
            itemStyle: { color: s.lineColor ?? undefined },
            lineStyle: s.seriesType !== "bar" ? { color: s.lineColor ?? undefined } : undefined,
            tooltip: unit ? {
                valueFormatter: (val: unknown) => `${val}${unit}`
            } : undefined
        };
        if (s.customSeriesOptions) {
            try { return deepMerge(baseSeries as object, JSON.parse(s.customSeriesOptions)) as Record<string, unknown>; } catch { /* ignore */ }
        }
        return baseSeries;
    });

    const hasAdditional = additionalSeries.length > 0;
    const showCatGrid = gridLines === "vertical" || gridLines === "both";
    const showValGrid = gridLines === "horizontal" || gridLines === "both";

    const option: EChartsOption = {
        ...(!props.darkMode && backgroundColor ? { backgroundColor } : {}),
        legend: buildLegend(showLegend, legendPosition),
        toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
        tooltip: { trigger: hasAdditional ? "axis" : "item" },
        grid: {
            left: legendPosition === "left" ? "20%" : "3%",
            right: legendPosition === "right" ? "20%" : "4%",
            bottom: categoryAxisLabel ? 60 : 30,
            containLabel: true
        },
        ...(horizontal
            ? {
                xAxis: { type: "value", scale: true, name: valueAxisLabel || undefined, nameLocation: "middle", nameGap: 30, splitLine: { show: showValGrid } },
                yAxis: { type: "category", data: categories, name: categoryAxisLabel || undefined, nameLocation: "middle", nameGap: 60, splitLine: { show: showCatGrid } }
            }
            : {
                xAxis: { type: "category", data: categories, name: categoryAxisLabel || undefined, nameLocation: "middle", nameGap: 30, splitLine: { show: showCatGrid } },
                yAxis: { type: "value", scale: true, name: valueAxisLabel || undefined, nameLocation: "middle", nameGap: 40, splitLine: { show: showValGrid } }
            }
        ),
        series: [rangeSeries, ...additionalSeries] as EChartsOption["series"]
    };

    if (props.customOption) {
        try { return deepMerge(option, JSON.parse(props.customOption)); } catch { /* ignore */ }
    }
    return option;
}

function buildEChartsOption(props: BarChartProps, counterOffset: number = 0): EChartsOption {
    const { series, categoryAxisLabel, valueAxisLabel, showLegend, legendPosition, showToolbox, gridLines, horizontal, stack, barWidth, xAxisDateFormat, backgroundColor } = props;

    const xIsDateTime = series.some(s => s.xIsDateTime);
    const categories = collectCategories(series, xAxisDateFormat);
    const showCatGrid = gridLines === "vertical" || gridLines === "both";
    const showValGrid = gridLines === "horizontal" || gridLines === "both";

    // When any series has a colorDim, use ECharts dataset so that visualMap
    // can reference the colorDim by name/index without conflicting with bar length.
    const anyColorDim = series.some(s => s.data.some(p => p.length === 3));

    // datasets[i] corresponds to series[i] when anyColorDim is true.
    const datasets: Array<{ dimensions: string[]; source: Array<[string, number | null, number | null]> }> = [];

    // Build per-series positional tooltips upfront so the chart-level formatter can use them.
    const positionalTooltipsPerSeries = series.map(s =>
        toPositionalTooltips(s, categories, xIsDateTime, xAxisDateFormat)
    );
    const hasAnyCustomTooltips = positionalTooltipsPerSeries.some(t => t.some(v => v));
    const hasAnyUnits = series.some(s => s.unit);

    // Chart-level tooltip formatter (trigger:"axis" ignores series-level formatters).
    const chartTooltipFormatter = (hasAnyCustomTooltips || hasAnyUnits)
        ? (paramsRaw: unknown): string => {
              const params = paramsRaw as Array<{
                  axisValue: unknown;
                  seriesIndex: number;
                  seriesName: string;
                  value: unknown;
                  dataIndex: number;
                  marker: string;
              }>;
              if (!params?.length) return "";
              const header = String(params[0].axisValue);
              const rows = params.map(p => {
                  const customText = positionalTooltipsPerSeries[p.seriesIndex]?.[p.dataIndex];
                  if (customText) return `${p.marker}${customText}`;
                  const s = series[p.seriesIndex];
                  const unit = s?.unit ? ` ${s.unit}` : "";
                  const displayVal = anyColorDim && Array.isArray(p.value)
                      ? (p.value as unknown[])[1]
                      : p.value;
                  return `${p.marker}${p.seriesName}: <b>${displayVal ?? "-"}${unit}</b>`;
              });
              return [header, ...rows].join("<br/>");
          }
        : undefined;

    const eChartsSeries: BarSeriesOption[] = series.map((s, index) => {
        const isLine = s.seriesType === "line";
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
                type: isLine ? ("line" as "bar") : "bar",
                stack: (!isLine && stack) ? "total" : undefined,
                barWidth: isLine ? undefined : (barWidth || undefined),
                yAxisIndex: s.yAxisIndex || undefined,
                datasetIndex,
                encode: horizontal
                    ? { x: "value", y: "category" }
                    : { y: "value", x: "category" },
                itemStyle: { color: s.lineColor ?? undefined }
            };
        } else {
            const data = toPositionalData(s, categories, xIsDateTime, xAxisDateFormat);
            baseSeries = {
                name: s.name,
                type: isLine ? ("line" as "bar") : "bar",
                stack: (!isLine && stack) ? "total" : undefined,
                barWidth: isLine ? undefined : (barWidth || undefined),
                yAxisIndex: s.yAxisIndex || undefined,
                data,
                itemStyle: { color: s.lineColor ?? undefined }
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
              ...(!props.darkMode && backgroundColor ? { backgroundColor } : {}),
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: chartTooltipFormatter as EChartsOption["tooltip"] extends { formatter?: infer F } ? F : never },
              legend: buildLegend(showLegend, legendPosition),
              toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
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
              ...(!props.darkMode && backgroundColor ? { backgroundColor } : {}),
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: chartTooltipFormatter as EChartsOption["tooltip"] extends { formatter?: infer F } ? F : never },
              legend: buildLegend(showLegend, legendPosition),
              toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
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
            const merged = deepMerge(option, JSON.parse(props.customOption));

            // If customOption replaced xAxis with an array, distribute the built
            // category data to each element that doesn't already have its own data.
            // Special value "counter" generates a running sequential array using
            // counterOffset so the numbers keep incrementing as data scrolls in.
            if (Array.isArray(merged.xAxis) && catAxisData) {
                const counter = catAxisData.map((_, i) => counterOffset + i + 1);
                (merged.xAxis as Array<Record<string, unknown>>).forEach(ax => {
                    if (ax.type === "category") {
                        if (ax.data === "counter") {
                            ax.data = counter;
                        } else if (!ax.data) {
                            ax.data = catAxisData;
                        }
                    }
                });
            }

            const xAxisOption = Array.isArray(merged.xAxis)
                ? (merged.xAxis as Array<{ axisLabel?: { rotate?: number } }>)[0]
                : merged.xAxis as { axisLabel?: { rotate?: number } } | undefined;
            const rotate = xAxisOption?.axisLabel?.rotate;
            if (rotate && Math.abs(rotate) > 0) {
                const grid = merged.grid as { bottom?: number | string } | undefined;
                if (grid && typeof grid.bottom === "number") {
                    grid.bottom = Math.max(grid.bottom, Math.round(Math.abs(rotate) * 1.5) + 20);
                }
            }
            return merged;
        } catch {
            console.warn("[EChartsBarChart] Invalid customOption JSON");
        }
    }

    return option;
}

const REGISTRY_KEY = "__echartsThemeRegistry";
const EVENT_NAME = "echarts-theme-registered";

function applyThemeRegistry(): void {
    const registry = (window as any)[REGISTRY_KEY] as Record<string, object> | undefined;
    if (!registry) return;
    for (const [name, theme] of Object.entries(registry)) {
        echarts.registerTheme(name, theme);
    }
}

export function BarChart(props: BarChartProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);
    // Per-series map from positional (category-sorted) index → original data index.
    // Kept in a ref so the click handler always sees the latest mapping without
    // needing to be re-registered on every render.
    const posToOrigRef = useRef<Map<number, number>[]>([]);
    const [reInitKey, setReInitKey] = useState(0);
    // Track running counter offset: increments each time the first category changes,
    // so "counter" axis data keeps incrementing as old records scroll out.
    const counterOffsetRef = useRef(0);
    const prevFirstCategoryRef = useRef<string | undefined>(undefined);

    // Initialize (or reinitialize) whenever reInitKey changes
    useEffect(() => {
        if (!containerRef.current) return;
        applyThemeRegistry();
        let initOpts: object = {};
        if (props.customInitOptions) {
            try { initOpts = JSON.parse(props.customInitOptions); } catch { /* ignore */ }
        }
        const theme = props.darkMode ? "dark" : (props.themeName || undefined);
        chartRef.current = echarts.init(containerRef.current, theme, { renderer: "canvas", ...initOpts });
        chartRef.current.resize();
        return () => {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, [reInitKey, props.darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reinitialize when the Theme Loader registers a matching theme at runtime
    useEffect(() => {
        if (!props.themeName) return;
        const handler = (e: Event) => {
            const { themeName } = (e as CustomEvent<{ themeName: string }>).detail ?? {};
            if (themeName === props.themeName) setReInitKey(k => k + 1);
        };
        window.addEventListener(EVENT_NAME, handler);
        return () => window.removeEventListener(EVENT_NAME, handler);
    }, [props.themeName]);

    // Update option on every render
    useEffect(() => {
        if (!chartRef.current) return;

        // Keep click-handler mapping in sync with the current data.
        const xIsDateTime = props.series.some(s => s.xIsDateTime);
        const categories = collectCategories(props.series, props.xAxisDateFormat);
        posToOrigRef.current = props.series.map(s =>
            buildPosToOrigMap(s, categories, xIsDateTime, props.xAxisDateFormat)
        );

        // Track how many times the first category has changed to maintain a running
        // counter offset for the "counter" axis feature.
        const firstCat = categories[0];
        if (firstCat !== undefined && firstCat !== prevFirstCategoryRef.current) {
            if (prevFirstCategoryRef.current !== undefined) {
                counterOffsetRef.current += 1;
            }
            prevFirstCategoryRef.current = firstCat;
        }

        let option: EChartsOption;
        if (props.rangeChart) {
            option = buildRangeChartOption(props);
        } else {
            const baseOption = buildEChartsOption(props, counterOffsetRef.current);
            const hasTimeline = props.timelineConfig && props.series.some(s => s.timelineSteps?.length);
            option = (hasTimeline
                ? buildTimelineOption(baseOption, props.series, props.timelineConfig!)
                : baseOption) as EChartsOption;
        }
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
