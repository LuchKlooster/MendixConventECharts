import { ReactElement, useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { PieChart as EChartsPieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, PieSeriesOption } from "echarts";
import { ObjectItem } from "mendix";

echarts.use([EChartsPieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

export interface PieSlice {
    name: string;
    value: number;
    color?: string;
    tooltip: string;
    onClickItem?: ObjectItem;
}

export interface BuiltPieSeries {
    name: string;
    slices: PieSlice[];
}

export interface PieChartProps {
    series: BuiltPieSeries[];
    donut: boolean;
    innerRadius: string;
    outerRadius: string;
    roseType: boolean;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    backgroundColor?: string;
    customOption?: string;
    customInitOptions?: string;
    onDataPointClick?: (seriesIndex: number, sliceIndex: number) => void;
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
 * Computes the [innerPct, outerPct] radius pair for each ring.
 * Single ring: uses innerRadius / outerRadius directly.
 * Multiple rings: distributes them evenly between innerRadius and outerRadius.
 */
function ringRadius(
    index: number,
    total: number,
    donut: boolean,
    innerRadius: string,
    outerRadius: string
): string | [string, string] {
    const outerPct = parseInt(outerRadius) || 70;
    const innerPct = (donut || total > 1) ? (parseInt(innerRadius) || 40) : 0;

    if (total === 1) {
        return innerPct > 0 ? [`${innerPct}%`, `${outerPct}%`] : `${outerPct}%`;
    }

    const gap = 3;
    const totalHeight = outerPct - innerPct;
    const ringH = Math.floor((totalHeight - gap * (total - 1)) / total);
    const ro = innerPct + (index + 1) * ringH + index * gap;
    const ri = innerPct + index * (ringH + gap);
    return [`${ri}%`, `${ro}%`];
}

function buildLegend(show: boolean, position: string) {
    const vertical = position === "left" || position === "right";
    const base = { show, type: "scroll" as const, orient: vertical ? "vertical" as const : "horizontal" as const };
    if (position === "bottom") return { ...base, bottom: 0, left: "center" as const };
    if (position === "left")   return { ...base, left: "left" as const, top: "middle" as const };
    if (position === "right")  return { ...base, right: 0, top: "middle" as const };
    return { ...base, top: "top" as const, left: "center" as const };
}

function buildEChartsOption(props: PieChartProps): EChartsOption {
    const { series, donut, innerRadius, outerRadius, roseType, showLegend, legendPosition, backgroundColor } = props;

    const eChartsSeries: PieSeriesOption[] = series.map((s, i) => {
        const hasCustomTooltips = s.slices.some(sl => sl.tooltip);

        const baseSeries: PieSeriesOption = {
            type: "pie",
            name: s.name || undefined,
            radius: ringRadius(i, series.length, donut, innerRadius, outerRadius),
            roseType: roseType ? "radius" : undefined,
            data: s.slices.map(sl => ({
                name: sl.name,
                value: sl.value,
                itemStyle: sl.color ? { color: sl.color } : undefined
            })),
            tooltip: {
                formatter: hasCustomTooltips
                    ? (params: unknown) => {
                          const p = params as { dataIndex: number; name: string; value: unknown; percent: number; marker: string };
                          const customText = s.slices[p.dataIndex]?.tooltip;
                          return customText || `${p.marker}${p.name}: ${p.value}`;
                      }
                    : undefined
            }
        };

        return baseSeries;
    });

    const option: EChartsOption = {
        backgroundColor: backgroundColor || "transparent",
        tooltip: { trigger: "item" },
        legend: buildLegend(showLegend, legendPosition),
        series: eChartsSeries
    };

    if (props.customOption) {
        try {
            return deepMerge(option, JSON.parse(props.customOption));
        } catch {
            console.warn("[EChartsPieChart] Invalid customOption JSON");
        }
    }

    return option;
}

export function PieChart(props: PieChartProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    // Initialize
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
        chartRef.current.setOption(buildEChartsOption(props) as EChartsOption, { notMerge: true });
    });

    // Click handler
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !props.onDataPointClick) return;
        const handler = (params: unknown) => {
            const p = params as { seriesIndex: number; dataIndex: number };
            props.onDataPointClick!(p.seriesIndex, p.dataIndex);
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
