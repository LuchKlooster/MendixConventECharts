import { ReactElement, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { PieChart as EChartsPieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, TitleComponent, ToolboxComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, PieSeriesOption } from "echarts";
import { ObjectItem } from "mendix";

echarts.use([EChartsPieChart, TooltipComponent, LegendComponent, TitleComponent, ToolboxComponent, CanvasRenderer]);

const REGISTRY_KEY = "__echartsThemeRegistry";
const EVENT_NAME = "echarts-theme-registered";

function applyThemeRegistry(): void {
    const registry = (window as any)[REGISTRY_KEY] as Record<string, object> | undefined;
    if (!registry) return;
    for (const [name, theme] of Object.entries(registry)) {
        echarts.registerTheme(name, theme);
    }
}

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
    customSeriesOptions?: string;
}

export interface PieChartProps {
    series: BuiltPieSeries[];
    donut: boolean;
    innerRadius: string;
    outerRadius: string;
    roseType: boolean;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    showToolbox: boolean;
    backgroundColor?: string;
    themeName?: string;
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
    const { series, donut, innerRadius, outerRadius, roseType, showLegend, legendPosition, showToolbox, backgroundColor } = props;

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

        if (s.customSeriesOptions) {
            try {
                return { ...baseSeries, ...JSON.parse(s.customSeriesOptions) };
            } catch {
                console.warn("[EChartsPieChart] Invalid customSeriesOptions JSON for series:", s.name);
            }
        }

        return baseSeries;
    });

    const option: EChartsOption = {
        ...(backgroundColor ? { backgroundColor } : {}),
        tooltip: { trigger: "item" },
        legend: buildLegend(showLegend, legendPosition),
        toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
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
    const [reInitKey, setReInitKey] = useState(0);

    // Initialize (or reinitialize) whenever reInitKey changes
    useEffect(() => {
        if (!containerRef.current) return;
        applyThemeRegistry();
        let initOpts: object = {};
        if (props.customInitOptions) {
            try { initOpts = JSON.parse(props.customInitOptions); } catch { /* ignore */ }
        }
        chartRef.current = echarts.init(containerRef.current, props.themeName || undefined, { renderer: "canvas", ...initOpts });
        chartRef.current.resize();
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
