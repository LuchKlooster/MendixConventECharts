/**
 * This file was generated from EChartsBarChart.xml
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
    dynamicName?: ListExpressionValue<string>;
    staticXAttribute?: ListAttributeValue<string | Date | Big>;
    dynamicXAttribute?: ListAttributeValue<string | Date | Big>;
    staticYAttribute?: ListAttributeValue<Big>;
    dynamicYAttribute?: ListAttributeValue<Big>;
    aggregationType: AggregationTypeEnum;
    staticTooltipHoverText?: ListExpressionValue<string>;
    dynamicTooltipHoverText?: ListExpressionValue<string>;
    staticColorDimAttribute?: ListAttributeValue<Big>;
    dynamicColorDimAttribute?: ListAttributeValue<Big>;
    staticBarColor?: ListExpressionValue<string>;
    dynamicBarColor?: ListExpressionValue<string>;
    staticOnClickAction?: ListActionValue;
    dynamicOnClickAction?: ListActionValue;
    staticTimelineAttribute?: ListAttributeValue<string | boolean | Date | Big>;
    dynamicTimelineAttribute?: ListAttributeValue<string | boolean | Date | Big>;
    customSeriesOptions: string;
}

export type LegendPositionEnum = "top" | "bottom" | "left" | "right";

export type GridLinesEnum = "none" | "horizontal" | "vertical" | "both";

export type WidthUnitEnum = "percentage" | "pixels";

export type HeightUnitEnum = "percentageOfWidth" | "pixels" | "percentageOfParent";

export interface SeriesPreviewType {
    dataSet: DataSetEnum;
    staticDataSource: {} | { caption: string } | { type: string } | null;
    dynamicDataSource: {} | { caption: string } | { type: string } | null;
    groupByAttribute: string;
    staticName: string;
    dynamicName: string;
    staticXAttribute: string;
    dynamicXAttribute: string;
    staticYAttribute: string;
    dynamicYAttribute: string;
    aggregationType: AggregationTypeEnum;
    staticTooltipHoverText: string;
    dynamicTooltipHoverText: string;
    staticColorDimAttribute: string;
    dynamicColorDimAttribute: string;
    staticBarColor: string;
    dynamicBarColor: string;
    staticOnClickAction: {} | null;
    dynamicOnClickAction: {} | null;
    staticTimelineAttribute: string;
    dynamicTimelineAttribute: string;
    customSeriesOptions: string;
}

export interface EChartsBarChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    series: SeriesType[];
    enableAdvancedOptions: boolean;
    horizontal: boolean;
    stack: boolean;
    barWidth: string;
    categoryAxisLabel?: DynamicValue<string>;
    categoryDateFormat: string;
    valueAxisLabel?: DynamicValue<string>;
    showLegend: boolean;
    legendPosition: LegendPositionEnum;
    showToolbox: boolean;
    gridLines: GridLinesEnum;
    backgroundColor: string;
    enableTimeline: boolean;
    timelineDateFormat: string;
    timelineAutoPlay: boolean;
    timelineLoop: boolean;
    timelinePlayInterval: number;
    timelineRewind: boolean;
    widthUnit: WidthUnitEnum;
    width: number;
    heightUnit: HeightUnitEnum;
    height: number;
    themeName: string;
    customLayout: string;
    customConfigurations: string;
}

export interface EChartsBarChartPreviewProps {
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
    horizontal: boolean;
    stack: boolean;
    barWidth: string;
    categoryAxisLabel: string;
    categoryDateFormat: string;
    valueAxisLabel: string;
    showLegend: boolean;
    legendPosition: LegendPositionEnum;
    showToolbox: boolean;
    gridLines: GridLinesEnum;
    backgroundColor: string;
    enableTimeline: boolean;
    timelineDateFormat: string;
    timelineAutoPlay: boolean;
    timelineLoop: boolean;
    timelinePlayInterval: number | null;
    timelineRewind: boolean;
    widthUnit: WidthUnitEnum;
    width: number | null;
    heightUnit: HeightUnitEnum;
    height: number | null;
    themeName: string;
    customLayout: string;
    customConfigurations: string;
}
