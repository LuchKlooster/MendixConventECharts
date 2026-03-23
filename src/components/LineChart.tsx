import { ReactElement, useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts/core";
import { LineChart as EChartsLineChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    TimelineComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { BuiltSeries } from "../utils/seriesBuilder";
import { GridLinesEnum } from "../../typings/EChartsLineChartProps";
import { formatTimestamp } from "../utils/dateFormat";
import { buildTimelineOption, TimelineConfig } from "../utils/timelineBuilder";

echarts.use([EChartsLineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, TimelineComponent, CanvasRenderer]);

export interface LineChartProps {
    series: BuiltSeries[];
    xAxisLabel: string;
    yAxisLabel: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    gridLines: GridLinesEnum;
    xAxisDateFormat?: string;
    backgroundColor?: string;
    timelineConfig?: TimelineConfig;
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
    const { series, xAxisLabel, yAxisLabel, showLegend, legendPosition, gridLines, xAxisDateFormat, backgroundColor } = props;

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
        backgroundColor: backgroundColor || "transparent",
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
            return deepMerge(option, custom);
        } catch {
            console.warn("[EChartsLineChart] Invalid customOption JSON");
        }
    }

    return option;
}

export function LineChart(props: LineChartProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    const initChart = useCallback(() => {
        if (!containerRef.current) return;

        let initOpts: object = {};
        if (props.customInitOptions) {
            try {
                initOpts = JSON.parse(props.customInitOptions);
            } catch {
                console.warn("[EChartsLineChart] Invalid customInitOptions JSON");
            }
        }

        chartRef.current = echarts.init(containerRef.current, undefined, {
            renderer: "canvas",
            ...initOpts
        });
    }, [props.customInitOptions]);

    // Initialize chart on mount
    useEffect(() => {
        initChart();
        return () => {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
