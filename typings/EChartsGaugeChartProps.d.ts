/**
 * This file was generated from EChartsGaugeChart.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ListValue, ListActionValue, ListAttributeValue, ListExpressionValue } from "mendix";
import { Big } from "big.js";

export type LegendPositionEnum = "top" | "bottom" | "left" | "right";

export type WidthUnitEnum = "percentage" | "pixels";

export type HeightUnitEnum = "percentageOfWidth" | "pixels" | "percentageOfParent";

export interface EChartsGaugeChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    dataSource?: ListValue;
    valueAttribute?: ListAttributeValue<Big>;
    labelAttribute?: ListExpressionValue<string>;
    onClickAction?: ListActionValue;
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
    legendPosition: LegendPositionEnum;
    backgroundColor: string;
    widthUnit: WidthUnitEnum;
    width: number;
    heightUnit: HeightUnitEnum;
    height: number;
    customLayout: string;
    customConfigurations: string;
}

export interface EChartsGaugeChartPreviewProps {
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
    dataSource: {} | { caption: string } | { type: string } | null;
    valueAttribute: string;
    labelAttribute: string;
    onClickAction: {} | null;
    enableAdvancedOptions: boolean;
    min: number | null;
    max: number | null;
    units: string;
    startAngle: number | null;
    endAngle: number | null;
    splitNumber: number | null;
    showProgress: boolean;
    colorRanges: string;
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
