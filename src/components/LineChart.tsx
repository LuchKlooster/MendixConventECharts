import { ReactElement, useEffect, useRef, useCallback, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart as EChartsLineChart } from "echarts/charts";
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
    PolarComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { BuiltSeries } from "../utils/seriesBuilder";
import { GridLinesEnum } from "../../typings/EChartsLineChartProps";
import { formatTimestamp } from "../utils/dateFormat";
import { buildTimelineOption, TimelineConfig } from "../utils/timelineBuilder";

echarts.use([EChartsLineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, TimelineComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, ToolboxComponent, BrushComponent, VisualMapComponent, PolarComponent, CanvasRenderer]);

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
    themeName?: string;
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
        const baseSeries: LineSeriesOption = {
            name: s.name,
            type: "line",
            smooth: s.smooth,
            showSymbol: s.showSymbol,
            data: s.data,
            itemStyle: {
                color: s.markerColor ?? s.lineColor ?? undefined
            },
            lineStyle: {
                color: s.lineColor ?? undefined
            },
            areaStyle: s.fillArea ? {} : undefined
        };

        if (s.lineStyle === "custom" && s.customSeriesOptions) {
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

    // For category axis: collect unique, sorted X values so each label appears only once
    const uniqueXCategories = !xIsDateTime
        ? Array.from(new Set(series.flatMap(s => s.data.map(([x]) => String(x))))).sort()
        : undefined;

    // Chart-level tooltip formatter:
    // - When xIsDateTime, ECharts would otherwise format the header with its own locale string
    //   ("2026-03-23 12:00:00") ignoring the user's xAxisDateFormat.
    // - With trigger:"axis", series-level tooltip.formatter is never called, so custom
    //   per-point tooltip text must also be handled here.
    const hasCustomTooltips = series.some(s => s.tooltips.some(t => t));
    const needsChartFormatter = xIsDateTime || hasCustomTooltips;
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
                  return `${p.marker}<b>${p.seriesName}</b>: ${val ?? "-"}`;
              });

              return [header, ...rows].join("<br/>");
          }
        : undefined;

    const option: EChartsOption = {
        ...(backgroundColor ? { backgroundColor } : {}),
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

        chartRef.current = echarts.init(containerRef.current, props.themeName || undefined, {
            renderer: "canvas",
            ...initOpts
        });
        chartRef.current.resize();
    }, [props.customInitOptions, props.themeName]);

    // Initialize (or reinitialize) whenever reInitKey changes
    useEffect(() => {
        initChart();
        return () => {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, [reInitKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const hasTimeline = props.timelineConfig && props.series.some(s => s.timelineSteps?.length);
        const option = hasTimeline
            ? buildTimelineOption(baseOption, props.series, props.timelineConfig!)
            : baseOption;
        chartRef.current.setOption(option as EChartsOption, { notMerge: true });
    });

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
