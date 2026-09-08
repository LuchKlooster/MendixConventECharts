import { ReactElement, useEffect, useRef, useCallback, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart as EChartsLineChart, BarChart as EChartsBarChart, CustomChart } from "echarts/charts";
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
    GraphicComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { BuiltSeries } from "../utils/seriesBuilder";
import { GridLinesEnum } from "../../typings/EChartsLineChartProps";
import { formatTimestamp } from "../utils/dateFormat";
import { buildTimelineOption, TimelineConfig } from "../utils/timelineBuilder";
import { registerEnhancedDarkTheme } from "../utils/darkTheme";
import { barRangeInstaller } from "../utils/barRange";

echarts.use([EChartsLineChart, EChartsBarChart, CustomChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, TimelineComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, ToolboxComponent, BrushComponent, VisualMapComponent, PolarComponent, GraphicComponent, CanvasRenderer]);
echarts.use(barRangeInstaller);
registerEnhancedDarkTheme(echarts);

export interface LineChartProps {
    series: BuiltSeries[];
    xAxisLabel: string;
    yAxisLabel: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    showToolbox: boolean;
    gridLines: GridLinesEnum;
    xAxisDateFormat?: string;
    backgroundColor?: string;
    timelineConfig?: TimelineConfig;
    /** When set, enables the race animation mode (line-race). Value is the ms per step. */
    racePlayInterval?: number;
    raceLoop?: boolean;
    /** Optional date format for the step label shown on the chart (reuses timelineDateFormat). */
    raceLabelFormat?: string;
    themeName?: string;
    darkMode?: boolean;
    customOption?: string;
    customInitOptions?: string;
    onDataPointClick?: (seriesIndex: number, dataIndex: number) => void;
    width: string;
    height: string;
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
            // Custom provides a single-element array but base has a plain object — merge the element in
            result[key] = deepMerge(tgtVal as object, srcVal[0] as object);
        } else if (Array.isArray(srcVal) && srcVal.length === 1 && srcVal[0] && typeof srcVal[0] === "object" &&
                   Array.isArray(tgtVal)) {
            // Custom provides a single-element array and base has an array (e.g. series) —
            // apply the single element as an override onto every element of the target array.
            result[key] = (tgtVal as Array<unknown>).map(tgt =>
                tgt && typeof tgt === "object"
                    ? deepMerge(tgt as object, (srcVal as Array<object>)[0])
                    : tgt
            );
        } else if (srcVal !== undefined) {
            result[key] = srcVal;
        }
    }
    return result as T;
}

function buildLegend(show: boolean, position: string) {
    const vertical = position === "left" || position === "right";
    const base = { show, type: "scroll" as const, orient: vertical ? "vertical" as const : "horizontal" as const };
    if (position === "bottom") return { ...base, bottom: 0, left: "center" as const };
    if (position === "left")   return { ...base, left: "left" as const, top: "middle" as const };
    if (position === "right")  return { ...base, right: 0, top: "middle" as const };
    return { ...base, top: "top" as const, left: "center" as const };
}

function buildEChartsOption(props: LineChartProps): EChartsOption {
    const { series, xAxisLabel, yAxisLabel, showLegend, legendPosition, showToolbox, gridLines, xAxisDateFormat, backgroundColor } = props;

    const xIsDateTime = series.some(s => s.xIsDateTime);

    const eChartsSeries: LineSeriesOption[] = series.map((s, index) => {
        const isBar = s.seriesType === "bar";
        const baseSeries: LineSeriesOption = {
            name: s.name,
            type: isBar ? ("bar" as "line") : "line",
            smooth: isBar ? undefined : s.smooth,
            showSymbol: isBar ? undefined : s.showSymbol,
            data: s.data,
            yAxisIndex: s.yAxisIndex || undefined,
            itemStyle: {
                color: s.markerColor ?? s.lineColor ?? undefined
            },
            lineStyle: isBar ? undefined : {
                color: s.lineColor ?? undefined
            },
            areaStyle: (!isBar && s.fillArea) ? {} : undefined
        };

        if (s.customSeriesOptions) {
            try {
                const custom = JSON.parse(s.customSeriesOptions);
                return deepMerge(baseSeries, custom) as LineSeriesOption;
            } catch {
                console.warn(`[EChartsLineChart] Series ${index}: invalid customSeriesOptions JSON`);
            }
        }

        return baseSeries;
    });

    const showXGrid = gridLines === "vertical" || gridLines === "both";
    const showYGrid = gridLines === "horizontal" || gridLines === "both";

    // For category axis: collect unique, sorted X values so each label appears only once.
    // For category axis: collect unique, sorted X values as strings.
    // Sort numerically when all values are numeric strings, otherwise lexicographically.
    const uniqueXCategories = !xIsDateTime
        ? (() => {
              const vals = Array.from(new Set(series.flatMap(s => s.data.map(([x]) => String(x)))));
              const allNumeric = vals.every(v => !isNaN(Number(v)) && v.trim() !== "");
              return allNumeric
                  ? vals.sort((a, b) => Number(a) - Number(b))
                  : vals.sort();
          })()
        : undefined;

    // Chart-level tooltip formatter:
    // - When xIsDateTime, ECharts would otherwise format the header with its own locale string
    //   ("2026-03-23 12:00:00") ignoring the user's xAxisDateFormat.
    // - With trigger:"axis", series-level tooltip.formatter is never called, so custom
    //   per-point tooltip text must also be handled here.
    const hasCustomTooltips = series.some(s => s.tooltips.some(t => t));
    const hasUnits = series.some(s => s.unit);
    const needsChartFormatter = xIsDateTime || hasCustomTooltips || hasUnits;
    const chartTooltipFormatter = needsChartFormatter
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

              let header: string;
              if (xIsDateTime) {
                  const ts = Number(params[0].axisValue);
                  header = xAxisDateFormat
                      ? formatTimestamp(ts, xAxisDateFormat)
                      : new Date(ts).toLocaleString();
              } else {
                  header = String(params[0].axisValue);
              }

              const rows = params.map(p => {
                  const s = series[p.seriesIndex];
                  const customText = s?.tooltips[p.dataIndex];
                  if (customText) return `${p.marker}${customText}`;
                  const val = Array.isArray(p.value) ? (p.value as unknown[])[1] : p.value;
                  const unit = s?.unit ? ` ${s.unit}` : "";
                  return `${p.marker}${p.seriesName}: <b>${val ?? "-"}${unit}</b>`;
              });

              return [header, ...rows].join("<br/>");
          }
        : undefined;

    const option: EChartsOption = {
        ...(!props.darkMode && backgroundColor ? { backgroundColor } : {}),
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
                label: (xIsDateTime && xAxisDateFormat)
                    ? {
                          formatter: (params: unknown) => {
                              const p = params as { value: unknown; axisDimension: string };
                              // Only reformat the x-axis label; leave the y-axis value as-is
                              if (p.axisDimension === "x") {
                                  return formatTimestamp(Number(p.value), xAxisDateFormat);
                              }
                              return String(p.value);
                          }
                      }
                    : undefined
            },
            formatter: chartTooltipFormatter as EChartsOption["tooltip"] extends { formatter?: infer F } ? F : never
        },
        legend: buildLegend(showLegend, legendPosition),
        toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
        grid: {
            left: legendPosition === "left" ? "20%" : "3%",
            right: legendPosition === "right" ? "20%" : "4%",
            bottom: xAxisLabel ? 60 : 30,
            containLabel: true
        },
        xAxis: {
            type: xIsDateTime ? "time" : "category",
            data: uniqueXCategories,
            name: xAxisLabel || undefined,
            nameLocation: "middle",
            nameGap: 30,
            boundaryGap: false,
            splitLine: { show: showXGrid },
            ...(xIsDateTime && xAxisDateFormat
                ? { axisLabel: { formatter: (value: number) => formatTimestamp(value, xAxisDateFormat) } }
                : {})
        } as EChartsOption["xAxis"],
        yAxis: {
            type: "value",
            scale: true,
            name: yAxisLabel || undefined,
            nameLocation: "middle",
            nameGap: 40,
            splitLine: { show: showYGrid }
        },
        series: eChartsSeries
    };

    if (props.customOption) {
        try {
            const custom = JSON.parse(props.customOption);
            const merged = deepMerge(option, custom);
            // Increase grid.bottom when xAxis labels are rotated so they don't overlap the dataZoom / container edge
            const xAxisOption = merged.xAxis as { axisLabel?: { rotate?: number } } | undefined;
            const rotate = xAxisOption?.axisLabel?.rotate;
            if (rotate && Math.abs(rotate) > 0) {
                const grid = merged.grid as { bottom?: number | string } | undefined;
                if (grid && typeof grid.bottom === "number") {
                    grid.bottom = Math.max(grid.bottom, Math.round(Math.abs(rotate) * 1.5) + 20);
                }
            }
            return merged;
        } catch {
            console.warn("[EChartsLineChart] Invalid customOption JSON");
        }
    }

    return option;
}

// ── Race animation helpers ────────────────────────────────────────────────────

/** Rounds value up to the next clean step (e.g. 65781 → 70000, 37000 → 40000). */
function niceMax(value: number): number {
    if (value <= 0) return value;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / magnitude) * magnitude;
}

/** Collects the ordered union of all timeline step keys across series (same logic as timelineBuilder). */
function collectRaceStepKeys(series: BuiltSeries[]): string[] {
    const seen = new Map<string, number | string>();
    for (const s of series) {
        if (!s.timelineSteps) continue;
        for (const step of s.timelineSteps) {
            if (!seen.has(step.key)) seen.set(step.key, step.sortValue);
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
 * Builds cumulative series data up to and including `upToIndex`.
 * Returns one entry per series with concatenated data from steps 0..upToIndex.
 */
function buildCumulativeSeriesData(
    series: BuiltSeries[],
    stepKeys: string[],
    upToIndex: number
): Array<{ data: Array<[string | number, number]> }> {
    return series.map(s => {
        if (!s.timelineSteps || s.timelineSteps.length === 0) {
            return { data: s.data as Array<[string | number, number]> };
        }
        const cumData: Array<[string | number, number]> = [];
        for (let i = 0; i <= upToIndex && i < stepKeys.length; i++) {
            const step = s.timelineSteps.find(t => t.key === stepKeys[i]);
            if (step) cumData.push(...step.data);
        }
        return { data: cumData };
    });
}


// ─────────────────────────────────────────────────────────────────────────────

const REGISTRY_KEY = "__echartsThemeRegistry";
const EVENT_NAME = "echarts-theme-registered";

/** Register all themes from the global registry on this bundle's ECharts instance. */
function applyThemeRegistry(): void {
    const registry = (window as any)[REGISTRY_KEY] as Record<string, object> | undefined;
    if (!registry) return;
    for (const [name, theme] of Object.entries(registry)) {
        echarts.registerTheme(name, theme);
    }
}

export function LineChart(props: LineChartProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);
    const [reInitKey, setReInitKey] = useState(0);
    // Race animation: track current step and keep a stable ref to the latest series
    const raceStepRef = useRef(0);
    const raceInitializedRef = useRef(false);
    const seriesRef = useRef<BuiltSeries[]>([]);
    seriesRef.current = props.series;
    // Memoize step keys so the race effect sees a stable identity when data hasn't changed
    const raceStepKeys = useMemo(
        () => (props.racePlayInterval !== undefined ? collectRaceStepKeys(props.series) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.racePlayInterval, JSON.stringify(
            props.series.map(s => s.timelineSteps?.map(t => t.key))
        )]
    );

    const initChart = useCallback(() => {
        if (!containerRef.current) return;

        applyThemeRegistry();

        let initOpts: object = {};
        if (props.customInitOptions) {
            try {
                initOpts = JSON.parse(props.customInitOptions);
            } catch {
                console.warn("[EChartsLineChart] Invalid customInitOptions JSON");
            }
        }

        const theme = props.darkMode ? "dark" : (props.themeName || undefined);
        chartRef.current = echarts.init(containerRef.current, theme, {
            renderer: "canvas",
            ...initOpts
        });
        chartRef.current.resize();
    }, [props.customInitOptions, props.themeName, props.darkMode]);

    // Initialize (or reinitialize) whenever reInitKey changes
    useEffect(() => {
        raceInitializedRef.current = false;
        initChart();
        return () => {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, [reInitKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reinitialize when darkMode changes
    useEffect(() => {
        setReInitKey(k => k + 1);
    }, [props.darkMode]);

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

    // Update chart option whenever data or config changes
    useEffect(() => {
        if (!chartRef.current) return;
        const baseOption = buildEChartsOption(props);

        if (props.racePlayInterval !== undefined) {
            // Race animation mode: show cumulative data up to the current step.
            // The race animation effect drives the interval; here we just (re)set
            // the full chart structure so axes and styling stay in sync with prop changes.
            const stepKeys = collectRaceStepKeys(props.series);
            const currentStep = stepKeys.length > 0
                ? Math.min(raceStepRef.current, stepKeys.length - 1)
                : 0;
            const cumSeries = buildCumulativeSeriesData(props.series, stepKeys, currentStep);

            // In race mode the X axis must be "value" (numeric), not "category".
            // On a category axis, [x, y] data uses x as the ordinal INDEX (0,1,2…),
            // so [1800, income] would try to plot at ordinal 1800 — way out of the
            // 81-category range — and nothing renders. A value axis plots x=1800
            // at the correct numeric position.
            //
            // Fix the min/max to the FULL data range so the axis always spans 1800–2012
            // from the start; without this the axis shrinks to current data and lines
            // appear to grow from the right instead of left.
            const allX = props.series.flatMap(s => s.data.map(([x]) => Number(x))).filter(v => !isNaN(v));
            const raceXMin = allX.length > 0 ? allX.reduce((m, v) => (v < m ? v : m), Infinity) : "dataMin";
            const raceXMax = allX.length > 0 ? allX.reduce((m, v) => (v > m ? v : m), -Infinity) : "dataMax";

            // Compute global Y max from ALL data so the Y axis is fixed for the full
            // animation. Without this, "dataMax" re-evaluates at each step against the
            // growing cumulative data and the axis keeps expanding.
            // If the user set an explicit numeric max via customOption, that takes priority.
            const baseYAxis = baseOption.yAxis as Record<string, unknown> | undefined;
            const userYMax = baseYAxis?.max;
            const allY = props.series.flatMap(s => s.data.map(([, y]) => Number(y))).filter(v => !isNaN(v));
            const globalYMax = allY.length > 0 ? allY.reduce((m, v) => (v > m ? v : m), -Infinity) : undefined;
            const raceYMax = (typeof userYMax === "number") ? userYMax
                : (globalYMax !== undefined ? niceMax(globalYMax) : undefined);

            const baseXAxis = baseOption.xAxis as Record<string, unknown>;
            const raceXAxis = {
                ...baseXAxis,
                type: "value",
                data: undefined,
                min: raceXMin,
                max: raceXMax,
                // Suppress ECharts' default thousand-separator formatting (1,800 → 1800)
                axisLabel: { formatter: (v: number) => String(v) }
            };

            const option = {
                ...baseOption,
                xAxis: raceXAxis,
                yAxis: { ...(baseYAxis ?? {}), min: 0, max: raceYMax },
                series: (baseOption.series as Array<object>).map((s, i) => {
                    const data = cumSeries[i]?.data ?? [];
                    return { ...s, data };
                })
            };
            // First call after init: use notMerge:true to establish the full chart state
            // (axes, grid lines, etc.). Subsequent re-renders use merge mode so the enter
            // animation is not restarted and chart state (grid lines, Y range) is preserved.
            const notMerge = !raceInitializedRef.current;
            raceInitializedRef.current = true;
            chartRef.current.setOption(option as EChartsOption, { notMerge });
        } else {
            const hasTimeline = props.timelineConfig && props.series.some(s => s.timelineSteps?.length);
            const option = hasTimeline
                ? buildTimelineOption(baseOption, props.series, props.timelineConfig!)
                : baseOption;
            chartRef.current.setOption(option as EChartsOption, { notMerge: true });
        }
    });

    // Race animation interval
    useEffect(() => {
        if (props.racePlayInterval === undefined) return;
        if (raceStepKeys.length === 0) return;

        const playInterval = props.racePlayInterval;
        const loop = props.raceLoop !== false;

        // Reset to step 0 whenever the step keys or interval changes
        raceStepRef.current = 0;

        const animDuration = Math.max(100, Math.min(playInterval - 100, 1400));

        const timer = setInterval(() => {
            const chart = chartRef.current;
            if (!chart) return;

            const series = seriesRef.current;
            const stepKeys = collectRaceStepKeys(series);
            if (stepKeys.length === 0) return;

            raceStepRef.current++;
            if (raceStepRef.current >= stepKeys.length) {
                if (loop) {
                    raceStepRef.current = 0;
                } else {
                    clearInterval(timer);
                    return;
                }
            }

            const cumSeries = buildCumulativeSeriesData(series, stepKeys, raceStepRef.current);

            chart.setOption({
                animationDurationUpdate: animDuration,
                animationEasingUpdate: "linear",
                series: cumSeries.map(s => ({ data: s.data }))
            } as EChartsOption);
        }, playInterval);

        return () => clearInterval(timer);
    }, [reInitKey, props.racePlayInterval, props.raceLoop, raceStepKeys]); // eslint-disable-line react-hooks/exhaustive-deps

    // Attach click handler
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !props.onDataPointClick) return;

        const handler = (params: unknown) => {
            const p = params as { seriesIndex: number; dataIndex: number };
            props.onDataPointClick!(p.seriesIndex, p.dataIndex);
        };
        chart.on("click", handler);
        return () => {
            chart.off("click", handler);
        };
    }, [props.onDataPointClick]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            chartRef.current?.resize();
        });
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
