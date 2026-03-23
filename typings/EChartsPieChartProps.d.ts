/**
 * This file was generated from EChartsPieChart.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { DynamicValue, ListValue, ListActionValue, ListAttributeValue, ListExpressionValue } from "mendix";
import { Big } from "big.js";

export type DataSetEnum = "static" | "dynamic";

export type AggregationTypeEnum = "none" | "count" | "sum" | "avg" | "min" | "max" | "median" | "mode" | "first" | "last";

export interface SeriesType {
    dataSet: DataSetEnum;
    staticDataSource?: ListValue;
    dynamicDataSource?: ListValue;
    groupByAttribute?: ListAttributeValue<string | boolean | Date | Big>;
    staticName?: DynamicValue<string>;
    staticNameAttribute?: ListAttributeValue<string | boolean | Big>;
    dynamicNameAttribute?: ListAttributeValue<string | boolean | Big>;
    staticValueAttribute?: ListAttributeValue<Big>;
    dynamicValueAttribute?: ListAttributeValue<Big>;
    aggregationType: AggregationTypeEnum;
    staticTooltipHoverText?: ListExpressionValue<string>;
    dynamicTooltipHoverText?: ListExpressionValue<string>;
    staticSliceColor?: ListExpressionValue<string>;
    dynamicSliceColor?: ListExpressionValue<string>;
    staticOnClickAction?: ListActionValue;
    dynamicOnClickAction?: ListActionValue;
    customSeriesOptions: string;
}

export type LegendPositionEnum = "top" | "bottom" | "left" | "right";

export type WidthUnitEnum = "percentage" | "pixels";

export type HeightUnitEnum = "percentageOfWidth" | "pixels" | "percentageOfParent";

export interface SeriesPreviewType {
    dataSet: DataSetEnum;
    staticDataSource: {} | { caption: string } | { type: string } | null;
    dynamicDataSource: {} | { caption: string } | { type: string } | null;
    groupByAttribute: string;
    staticName: string;
    staticNameAttribute: string;
    dynamicNameAttribute: string;
    staticValueAttribute: string;
    dynamicValueAttribute: string;
    aggregationType: AggregationTypeEnum;
    staticTooltipHoverText: string;
    dynamicTooltipHoverText: string;
    staticSliceColor: string;
    dynamicSliceColor: string;
    staticOnClickAction: {} | null;
    dynamicOnClickAction: {} | null;
    customSeriesOptions: string;
}

export interface EChartsPieChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    series: SeriesType[];
    enableAdvancedOptions: boolean;
    donut: boolean;
    innerRadius: string;
    outerRadius: string;
    roseType: boolean;
    showLegend: boolean;
    legendPosition: LegendPositionEnum;
    backgroundColor: string;
    widthUnit: WidthUnitEnum;
    width: number;
    heightUnit: HeightUnitEnum;
    height: number;
    customLayout: string;
    customConfigurations: string;
}

export interface EChartsPieChartPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    series: SeriesPreviewType[];
    enableAdvancedOptions: boolean;
    donut: boolean;
    innerRadius: string;
    outerRadius: string;
    roseType: boolean;
    showLegend: boolean;
    legendPosition: LegendPositionEnum;
    backgroundColor: string;
    widthUnit: WidthUnitEnum;
    width: number | null;
    heightUnit: HeightUnitEnum;
    height: number | null;
    customLayout: string;
    customConfigurations: string;
}
