/**
 * This file was generated from EChartsGaugeChart.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { DynamicValue, EditableValue, ListValue, ListAttributeValue } from "mendix";
import { Big } from "big.js";

export type LegendPositionEnum = "top" | "bottom" | "left" | "right";

export type WidthUnitEnum = "percentage" | "pixels";

export type HeightUnitEnum = "percentageOfWidth" | "pixels" | "percentageOfParent";

export interface EChartsGaugeChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    useListMode: boolean;
    dataSource?: ListValue;
    listValueAttribute?: ListAttributeValue<Big>;
    listLabelAttribute?: ListAttributeValue<string>;
    listCustomOptions: string;
    valueAttribute?: EditableValue<Big>;
    labelAttribute?: DynamicValue<string>;
    series1CustomOptions: string;
    valueAttribute2?: EditableValue<Big>;
    labelAttribute2?: DynamicValue<string>;
    series2Min: number;
    series2Max: number;
    series2CustomOptions: string;
    valueAttribute3?: EditableValue<Big>;
    labelAttribute3?: DynamicValue<string>;
    series3Min: number;
    series3Max: number;
    series3CustomOptions: string;
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
    showToolbox: boolean;
    backgroundColor: string;
    widthUnit: WidthUnitEnum;
    width: number;
    heightUnit: HeightUnitEnum;
    height: number;
    themeName: string;
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
    useListMode: boolean;
    dataSource: {} | { caption: string } | { type: string } | null;
    listValueAttribute: string;
    listLabelAttribute: string;
    listCustomOptions: string;
    valueAttribute: string;
    labelAttribute: string;
    series1CustomOptions: string;
    valueAttribute2: string;
    labelAttribute2: string;
    series2Min: number | null;
    series2Max: number | null;
    series2CustomOptions: string;
    valueAttribute3: string;
    labelAttribute3: string;
    series3Min: number | null;
    series3Max: number | null;
    series3CustomOptions: string;
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
    showToolbox: boolean;
    backgroundColor: string;
    widthUnit: WidthUnitEnum;
    width: number | null;
    heightUnit: HeightUnitEnum;
    height: number | null;
    themeName: string;
    customLayout: string;
    customConfigurations: string;
}
