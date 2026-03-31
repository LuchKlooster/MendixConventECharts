import { ReactElement, useCallback, CSSProperties } from "react";
import { PieChart, BuiltPieSeries } from "./components/PieChart";
import { aggregateDataPoints, DataPoint } from "./utils/aggregation";
import "./ui/EChartsLineChart.css";
import { ObjectItem } from "mendix";

interface EChartsPieChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    series: any[];
    donut: boolean;
    innerRadius: string;
    outerRadius: string;
    roseType: boolean;
    showLegend: boolean;
    legendPosition: "top" | "bottom" | "left" | "right";
    showToolbox: boolean;
    backgroundColor: string;
    enableAdvancedOptions: boolean;
    widthUnit: "percentage" | "pixels";
    width: number;
    heightUnit: "percentageOfWidth" | "pixels" | "percentageOfParent";
    height: number;
    themeName: string;
    customLayout: string;
    customConfigurations: string;
}

function buildStaticPieSeries(s: any): BuiltPieSeries {
    const ds = s.staticDataSource;
    if (!ds || ds.status !== "available" || !ds.items) return { name: "", slices: [] };

    const items: ObjectItem[] = ds.items;
    const firstItemMap = new Map<string, ObjectItem>();

    const rawPoints: DataPoint[] = items.map((item: ObjectItem) => {
        const name = s.staticNameAttribute
            ? String(s.staticNameAttribute.get(item).value ?? "")
            : "";
        const value = s.staticValueAttribute
            ? Number(s.staticValueAttribute.get(item).value ?? 0)
            : 0;
        const tooltip = s.staticTooltipHoverText?.get(item).value ?? "";
        if (!firstItemMap.has(name)) firstItemMap.set(name, item);
        return { x: name, y: value, tooltip };
    });

    const points = aggregateDataPoints(rawPoints, s.aggregationType || "sum");

    return {
        name: s.staticName?.value ?? "",
        slices: points.map(p => {
            const firstItem = firstItemMap.get(String(p.x));
            return {
                name: String(p.x),
                value: p.y,
                color: firstItem && s.staticSliceColor
                    ? (s.staticSliceColor.get(firstItem).value ?? undefined)
                    : undefined,
                tooltip: p.tooltip ?? "",
                onClickItem: firstItem
            };
        }),
        customSeriesOptions: s.customSeriesOptions || undefined
    };
}

function buildDynamicPieSeries(s: any): BuiltPieSeries[] {
    const ds = s.dynamicDataSource;
    if (!ds || ds.status !== "available" || !ds.items) return [];

    const items: ObjectItem[] = ds.items;
    const groups = new Map<string, ObjectItem[]>();
    for (const item of items) {
        const key = s.groupByAttribute
            ? String(s.groupByAttribute.get(item).value ?? "")
            : "default";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }

    return Array.from(groups.entries()).map(([groupKey, groupItems]) => {
        const firstItemMap = new Map<string, ObjectItem>();
        const rawPoints: DataPoint[] = groupItems.map((item: ObjectItem) => {
            const name = s.dynamicNameAttribute
                ? String(s.dynamicNameAttribute.get(item).value ?? "")
                : "";
            const value = s.dynamicValueAttribute
                ? Number(s.dynamicValueAttribute.get(item).value ?? 0)
                : 0;
            const tooltip = s.dynamicTooltipHoverText?.get(item).value ?? "";
            if (!firstItemMap.has(name)) firstItemMap.set(name, item);
            return { x: name, y: value, tooltip };
        });

        const points = aggregateDataPoints(rawPoints, s.aggregationType || "sum");

        return {
            name: groupKey,
            slices: points.map(p => {
                const firstItem = firstItemMap.get(String(p.x));
                return {
                    name: String(p.x),
                    value: p.y,
                    color: firstItem && s.dynamicSliceColor
                        ? (s.dynamicSliceColor.get(firstItem).value ?? undefined)
                        : undefined,
                    tooltip: p.tooltip ?? "",
                    onClickItem: firstItem
                };
            }),
            customSeriesOptions: s.customSeriesOptions || undefined
        };
    });
}

export function EChartsPieChart(props: EChartsPieChartContainerProps): ReactElement {
    const {
        series: seriesProps,
        donut,
        innerRadius,
        outerRadius,
        roseType,
        showLegend,
        legendPosition,
        showToolbox,
        backgroundColor,
        widthUnit,
        width,
        heightUnit,
        height,
        themeName,
        customLayout,
        customConfigurations,
        class: className,
        style
    } = props;

    const builtSeries: BuiltPieSeries[] = seriesProps.flatMap((s: any) =>
        s.dataSet === "static"
            ? [buildStaticPieSeries(s)]
            : buildDynamicPieSeries(s)
    );

    const onDataPointClick = useCallback(
        (seriesIndex: number, sliceIndex: number) => {
            const s = builtSeries[seriesIndex];
            if (!s) return;
            const slice = s.slices[sliceIndex];
            if (!slice?.onClickItem) return;
            const raw = seriesProps[seriesIndex];
            if (!raw) return;
            if (raw.dataSet === "static" && raw.staticOnClickAction) {
                const action = raw.staticOnClickAction.get(slice.onClickItem);
                if (action.canExecute) action.execute();
            } else if (raw.dataSet === "dynamic" && raw.dynamicOnClickAction) {
                const action = raw.dynamicOnClickAction.get(slice.onClickItem);
                if (action.canExecute) action.execute();
            }
        },
        [builtSeries, seriesProps]
    );

    const containerStyle = buildContainerStyle(widthUnit, width, heightUnit, height, style);

    return (
        <div className={`widget-echarts ${className}`} style={containerStyle}>
            <PieChart
                series={builtSeries}
                donut={donut}
                innerRadius={innerRadius || "40%"}
                outerRadius={outerRadius || "70%"}
                roseType={roseType}
                showLegend={showLegend}
                legendPosition={legendPosition}
                showToolbox={showToolbox}
                backgroundColor={backgroundColor || undefined}
                themeName={themeName || undefined}
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
