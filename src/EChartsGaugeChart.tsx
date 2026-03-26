import { ReactElement, CSSProperties } from "react";
import { GaugeChart, GaugePointer, GaugeSeries } from "./components/GaugeChart";
import "./ui/EChartsLineChart.css"; // shared stylesheet

// Context-driven attribute: Mendix EditableValue exposes .value directly
type ContextAttr = { value?: unknown };
type ContextText = { value?: unknown };

interface EChartsGaugeChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    // Series 1
    valueAttribute?: ContextAttr;
    labelAttribute?: ContextText;
    series1CustomOptions: string;
    // Series 2 (optional)
    valueAttribute2?: ContextAttr;
    labelAttribute2?: ContextText;
    series2Min: number;
    series2Max: number;
    series2CustomOptions: string;
    // Series 3 (optional)
    valueAttribute3?: ContextAttr;
    labelAttribute3?: ContextText;
    series3Min: number;
    series3Max: number;
    series3CustomOptions: string;
    // General
    enableAdvancedOptions: boolean;
    min: number;
    max: number;
    units: string;
    startAngle: number;
    endAngle: number;
    splitNumber: number;
    showProgress: boolean;
    colorRanges: string;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    backgroundColor: string;
    widthUnit: "percentage" | "pixels";
    width: number;
    heightUnit: "percentageOfWidth" | "pixels" | "percentageOfParent";
    height: number;
    customLayout: string;
    customConfigurations: string;
}

function makePointer(valueAttr?: ContextAttr, labelAttr?: ContextText): GaugePointer {
    return {
        name: String(labelAttr?.value ?? ""),
        value: Number(valueAttr?.value ?? 0)
    };
}

export function EChartsGaugeChart(props: EChartsGaugeChartContainerProps): ReactElement {
    const {
        valueAttribute, labelAttribute, series1CustomOptions,
        valueAttribute2, labelAttribute2, series2Min, series2Max, series2CustomOptions,
        valueAttribute3, labelAttribute3, series3Min, series3Max, series3CustomOptions,
        min, max, units, startAngle, endAngle, splitNumber,
        showProgress, colorRanges, showLegend, legendPosition, backgroundColor,
        widthUnit, width, heightUnit, height,
        customLayout, customConfigurations,
        class: className, style
    } = props;

    const isMultiSeries = !!(valueAttribute2 || valueAttribute3);

    const seriesList: GaugeSeries[] | undefined = isMultiSeries ? [
        { pointers: [makePointer(valueAttribute, labelAttribute)], min, max, customSeriesOptions: series1CustomOptions || undefined },
        ...(valueAttribute2 ? [{ pointers: [makePointer(valueAttribute2, labelAttribute2)], min: series2Min, max: series2Max, customSeriesOptions: series2CustomOptions || undefined }] : []),
        ...(valueAttribute3 ? [{ pointers: [makePointer(valueAttribute3, labelAttribute3)], min: series3Min, max: series3Max, customSeriesOptions: series3CustomOptions || undefined }] : [])
    ] : undefined;

    const pointers: GaugePointer[] = isMultiSeries ? [] : [makePointer(valueAttribute, labelAttribute)];

    const containerStyle = buildContainerStyle(widthUnit, width, heightUnit, height, style);

    return (
        <div className={`widget-echarts ${className}`} style={containerStyle}>
            <GaugeChart
                pointers={pointers}
                seriesList={seriesList}
                min={min}
                max={max}
                units={units || ""}
                startAngle={startAngle}
                endAngle={endAngle}
                splitNumber={splitNumber}
                showProgress={showProgress}
                colorRanges={colorRanges || undefined}
                showLegend={showLegend}
                legendPosition={legendPosition}
                backgroundColor={backgroundColor || undefined}
                customOption={customLayout || undefined}
                customInitOptions={customConfigurations || undefined}
            />
        </div>
    );
}

function buildContainerStyle(
    widthUnit: "percentage" | "pixels",
    width: number,
    heightUnit: "percentageOfWidth" | "pixels" | "percentageOfParent",
    height: number,
    extraStyle?: CSSProperties
): CSSProperties {
    const style: CSSProperties = { ...extraStyle };
    style.width = widthUnit === "pixels" ? `${width}px` : `${width}%`;
    if (heightUnit === "pixels") {
        style.height = `${height}px`;
    } else if (heightUnit === "percentageOfParent") {
        style.height = `${height}%`;
    } else {
        style.aspectRatio = `100 / ${height}`;
        style.height = "auto";
    }
    return style;
}
