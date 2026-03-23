import { ReactElement, useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { GaugeChart as EChartsGaugeChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, GaugeSeriesOption } from "echarts";

echarts.use([EChartsGaugeChart, TooltipComponent, LegendComponent, CanvasRenderer]);

export interface GaugePointer {
    name: string;
    value: number;
}

export interface GaugeChartProps {
    pointers: GaugePointer[];
    min: number;
    max: number;
    units: string;
    startAngle: number;
    endAngle: number;
    splitNumber: number;
    showProgress: boolean;
    colorRanges?: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    backgroundColor?: string;
    customOption?: string;
    customInitOptions?: string;
    onDataPointClick?: (dataIndex: number) => void;
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

const DEFAULT_COLOR: [number, string][] = [[1, "#E6EBF8"]];

function parseColorRanges(json?: string): [number, string][] {
    if (!json?.trim()) return DEFAULT_COLOR;
    try {
        return JSON.parse(json);
    } catch {
        console.warn("[EChartsGaugeChart] Invalid colorRanges JSON");
        return DEFAULT_COLOR;
    }
}

function buildEChartsOption(props: GaugeChartProps): EChartsOption {
    const {
        pointers, min, max, units, startAngle, endAngle, splitNumber,
        showProgress, colorRanges, showLegend, legendPosition, backgroundColor
    } = props;

    const colors = parseColorRanges(colorRanges);

    const series: GaugeSeriesOption = {
        type: "gauge",
        min,
        max,
        startAngle,
        endAngle,
        splitNumber,
        progress: { show: showProgress, width: 10 },
        axisLine: {
            lineStyle: { width: 10, color: colors }
        },
        pointer: { itemStyle: { color: "auto" } },
        axisTick: { show: true },
        splitLine: { length: 15, lineStyle: { width: 2, color: "#999" } },
        axisLabel: { distance: 15, color: "#999", fontSize: 12 },
        detail: {
            valueAnimation: true,
            formatter: units ? `{value} ${units}` : "{value}",
            color: "auto",
            fontSize: 20
        },
        data: pointers.map(p => ({ name: p.name, value: p.value }))
    };

    const option: EChartsOption = {
        backgroundColor: backgroundColor || "transparent",
        legend: buildLegend(showLegend, legendPosition),
        tooltip: { trigger: "item" },
        series: [series]
    };

    if (props.customOption) {
        try {
            return deepMerge(option, JSON.parse(props.customOption));
        } catch {
            console.warn("[EChartsGaugeChart] Invalid customOption JSON");
        }
    }

    return option;
}

export function GaugeChart(props: GaugeChartProps): ReactElement {
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
            const p = params as { dataIndex: number };
            props.onDataPointClick!(p.dataIndex);
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
