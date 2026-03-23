import { ReactElement, useCallback, CSSProperties } from "react";
import { GaugeChart, GaugePointer } from "./components/GaugeChart";
import { ObjectItem } from "mendix";
import "./ui/EChartsLineChart.css";

interface EChartsGaugeChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    dataSource: { status: string; items?: ObjectItem[] };
    valueAttribute?: { get: (item: ObjectItem) => { value?: unknown } };
    labelAttribute?: { get: (item: ObjectItem) => { value?: unknown } };
    onClickAction?: { get: (item: ObjectItem) => { canExecute: boolean; execute: () => void } };
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

export function EChartsGaugeChart(props: EChartsGaugeChartContainerProps): ReactElement {
    const {
        dataSource, valueAttribute, labelAttribute, onClickAction,
        min, max, units, startAngle, endAngle, splitNumber,
        showProgress, colorRanges, showLegend, legendPosition, backgroundColor,
        widthUnit, width, heightUnit, height,
        customLayout, customConfigurations,
        class: className, style
    } = props;

    const items = dataSource?.status === "available" ? (dataSource.items ?? []) : [];

    const pointers: GaugePointer[] = items.map((item: ObjectItem) => ({
        name: labelAttribute ? String(labelAttribute.get(item).value ?? "") : "",
        value: valueAttribute ? Number(valueAttribute.get(item).value ?? 0) : 0
    }));

    const onDataPointClick = useCallback(
        (dataIndex: number) => {
            const item = items[dataIndex];
            if (!item || !onClickAction) return;
            const action = onClickAction.get(item);
            if (action.canExecute) action.execute();
        },
        [items, onClickAction]
    );

    const containerStyle = buildContainerStyle(widthUnit, width, heightUnit, height, style);

    return (
        <div className={`widget-echarts ${className}`} style={containerStyle}>
            <GaugeChart
                pointers={pointers}
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
                onDataPointClick={onDataPointClick}
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
