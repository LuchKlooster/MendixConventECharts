import { ReactElement, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { GaugeChart as EChartsGaugeChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, TitleComponent, ToolboxComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption, GaugeSeriesOption } from "echarts";

echarts.use([EChartsGaugeChart, TooltipComponent, LegendComponent, TitleComponent, ToolboxComponent, CanvasRenderer]);

const REGISTRY_KEY = "__echartsThemeRegistry";
const EVENT_NAME = "echarts-theme-registered";

function applyThemeRegistry(): void {
    const registry = (window as any)[REGISTRY_KEY] as Record<string, object> | undefined;
    if (!registry) return;
    for (const [name, theme] of Object.entries(registry)) {
        echarts.registerTheme(name, theme);
    }
}

export interface GaugePointer {
    name: string;
    value: number;
    titleOffset?: [string | number, string | number];
    detailOffset?: [string | number, string | number];
}

export interface GaugeSeries {
    pointers: GaugePointer[];
    min?: number;
    max?: number;
    customSeriesOptions?: string;
    onDataPointClick?: (dataIndex: number) => void;
}

export interface GaugeChartProps {
    pointers: GaugePointer[];
    seriesList?: GaugeSeries[];
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
    showToolbox: boolean;
    backgroundColor?: string;
    themeName?: string;
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
        } else if (Array.isArray(srcVal) && srcVal.length === 1 && srcVal[0] && typeof srcVal[0] === "object" &&
                   tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)) {
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

function buildBaseSeries(
    min: number,
    max: number,
    startAngle: number,
    endAngle: number,
    splitNumber: number,
    showProgress: boolean,
    colors: [number, string][],
    units: string
): GaugeSeriesOption {
    return {
        type: "gauge",
        min,
        max,
        startAngle,
        endAngle,
        splitNumber,
        progress: { show: showProgress, width: 10 },
        axisLine: { lineStyle: { width: 10, color: colors } },
        pointer: { itemStyle: { color: "inherit" } },
        axisTick: { show: true },
        splitLine: { length: 15, lineStyle: { width: 2, color: "#999" } },
        axisLabel: { distance: 15, color: "#999", fontSize: 12 },
        detail: {
            valueAnimation: true,
            formatter: units ? `{value} ${units}` : "{value}",
            color: "inherit",
            fontSize: 20
        }
    };
}

function parseFunctionString(val: unknown): unknown {
    if (typeof val !== "string") return val;
    const s = val.trim();
    if (s.startsWith("function")) {
        try {
            // eslint-disable-next-line no-new-func
            return new Function(`return (${s})`)();
        } catch {
            console.warn("[EChartsGaugeChart] Could not parse formatter function string");
        }
    }
    return val;
}

function resolveFormatters(series: GaugeSeriesOption): GaugeSeriesOption {
    const s = series as Record<string, unknown>;
    if (s.axisLabel && typeof s.axisLabel === "object") {
        const al = s.axisLabel as Record<string, unknown>;
        if (typeof al.formatter === "string") al.formatter = parseFunctionString(al.formatter);
    }
    if (s.detail && typeof s.detail === "object") {
        const d = s.detail as Record<string, unknown>;
        if (typeof d.formatter === "string") d.formatter = parseFunctionString(d.formatter);
    }
    return series;
}

function buildEChartsOption(props: GaugeChartProps): EChartsOption {
    const {
        pointers, seriesList, min, max, units, startAngle, endAngle, splitNumber,
        showProgress, colorRanges, showLegend, legendPosition, showToolbox, backgroundColor
    } = props;

    const colors = parseColorRanges(colorRanges);

    let seriesArray: GaugeSeriesOption[];

    if (seriesList && seriesList.length > 0) {
        seriesArray = seriesList.map(s => {
            const base = buildBaseSeries(
                s.min ?? min,
                s.max ?? max,
                startAngle,
                endAngle,
                splitNumber,
                showProgress,
                colors,
                units
            );
            const withData: GaugeSeriesOption = {
                ...base,
                data: s.pointers.map(p => ({
                    name: p.name,
                    value: p.value,
                    ...(p.titleOffset ? { title: { offsetCenter: p.titleOffset } } : {}),
                    ...(p.detailOffset ? { detail: { offsetCenter: p.detailOffset } } : {})
                }))
            };
            if (s.customSeriesOptions) {
                try {
                    return resolveFormatters(deepMerge(withData, JSON.parse(s.customSeriesOptions) as Partial<GaugeSeriesOption>));
                } catch {
                    console.warn("[EChartsGaugeChart] Invalid customSeriesOptions JSON in series");
                }
            }
            return resolveFormatters(withData);
        });
    } else {
        const base = buildBaseSeries(min, max, startAngle, endAngle, splitNumber, showProgress, colors, units);
        seriesArray = [{ ...base, data: pointers.map(p => ({
            name: p.name,
            value: p.value,
            ...(p.titleOffset ? { title: { offsetCenter: p.titleOffset } } : {}),
            ...(p.detailOffset ? { detail: { offsetCenter: p.detailOffset } } : {})
        })) }];
    }

    const option: EChartsOption = {
        ...(backgroundColor ? { backgroundColor } : {}),
        legend: buildLegend(showLegend, legendPosition),
        toolbox: showToolbox ? { feature: { dataView: { show: true, readOnly: false }, restore: { show: true }, saveAsImage: { show: true } } } : undefined,
        tooltip: { trigger: "item" },
        series: seriesArray
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
    const propsRef = useRef(props);
    const [reInitKey, setReInitKey] = useState(0);

    // Keep propsRef current on every render (no side effects)
    propsRef.current = props;

    // Initialize (or reinitialize) whenever reInitKey changes
    useEffect(() => {
        if (!containerRef.current) return;
        applyThemeRegistry();
        let initOpts: object = {};
        if (propsRef.current.customInitOptions) {
            try { initOpts = JSON.parse(propsRef.current.customInitOptions); } catch { /* ignore */ }
        }
        chartRef.current = echarts.init(containerRef.current, propsRef.current.themeName || undefined, { renderer: "canvas", ...initOpts });
        chartRef.current.resize();
        // Apply current option immediately so the chart is not blank after reinit
        chartRef.current.setOption(buildEChartsOption(propsRef.current) as EChartsOption, { notMerge: true });
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

    // Serialize data to a stable string so setOption is only called when values actually change
    const optionKey = JSON.stringify(
        (props.seriesList ?? [{ pointers: props.pointers }]).map(s =>
            s.pointers.map(p => ({ n: p.name, v: p.value }))
        )
    ) + props.colorRanges + props.min + props.max + props.customOption + (props.seriesList?.map(s => s.customSeriesOptions).join("") ?? "");

    // Update option only when data or config actually changes
    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.setOption(buildEChartsOption(propsRef.current) as EChartsOption, { notMerge: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionKey]);

    // Click handler — registered once, reads current props via ref to avoid re-registering on every render
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const handler = (params: unknown) => {
            const p = params as { seriesIndex: number; dataIndex: number };
            const { seriesList, onDataPointClick } = propsRef.current;
            if (seriesList && seriesList.length > 0) {
                seriesList[p.seriesIndex]?.onDataPointClick?.(p.dataIndex);
            } else {
                onDataPointClick?.(p.dataIndex);
            }
        };
        chart.on("click", handler);
        return () => { chart.off("click", handler); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
