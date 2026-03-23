import { ObjectItem, ListAttributeValue } from "mendix";
import { Big } from "big.js";
import { LinesType, LineStyleEnum, AggregationTypeEnum } from "../../typings/EChartsLineChartProps";
import { aggregateDataPoints, DataPoint } from "./aggregation";

export interface TimelineStep {
    key: string;          // unique key (raw string of the attribute value)
    sortValue: string | number; // used for sorting steps
    data: Array<[string | number, number]>;
    tooltips: string[];
}

export interface BuiltSeries {
    name: string;
    smooth: boolean;
    showSymbol: boolean;
    lineStyle: LineStyleEnum;
    fillArea: boolean;
    lineColor?: string;
    markerColor?: string;
    xIsDateTime: boolean;
    data: Array<[string | number, number]>;
    tooltips: string[];
    customSeriesOptions: string;
    onClickItems: ObjectItem[];
    // When a timeline attribute is set, data is split per step
    timelineSteps?: TimelineStep[];
}

function attributeValueToX(value: unknown): { x: string | number; isDate: boolean } {
    if (value === undefined || value === null) return { x: "", isDate: false };
    if (value instanceof Date) return { x: value.getTime(), isDate: true };
    if (value instanceof Big) return { x: value.toFixed(2), isDate: false };
    return { x: String(value), isDate: false };
}

function attributeValueToString(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Big) return value.toFixed(2);
    return String(value);
}

function attributeValueToNumber(value: unknown): number {
    if (value === undefined || value === null) return 0;
    if (value instanceof Big) return value.toNumber();
    if (value instanceof Date) return value.getTime();
    return Number(value);
}

export function buildSeries(lines: LinesType[]): BuiltSeries[] {
    const result: BuiltSeries[] = [];

    for (const line of lines) {
        if (line.dataSet === "static") {
            result.push(...buildStaticSeries(line));
        } else {
            result.push(...buildDynamicSeries(line));
        }
    }

    return result;
}

function buildStaticSeries(line: LinesType): BuiltSeries[] {
    const ds = line.staticDataSource;
    if (!ds || ds.status !== "available" || !ds.items) return [];

    const items = ds.items;
    let xIsDateTime = false;
    const rawPoints: DataPoint[] = items.map(item => {
        const xResult = line.staticXAttribute
            ? attributeValueToX(line.staticXAttribute.get(item).value)
            : { x: "", isDate: false };
        if (xResult.isDate) xIsDateTime = true;
        return {
            x: xResult.x,
            y: line.staticYAttribute
                ? attributeValueToNumber(line.staticYAttribute.get(item).value)
                : 0,
            tooltip: line.staticTooltipHoverText?.get(item).value ?? undefined
        };
    });

    const points = aggregateDataPoints(rawPoints, line.aggregationType);

    const firstItem = items[0];
    const lineColor =
        firstItem && line.staticLineColor
            ? (line.staticLineColor.get(firstItem).value ?? undefined)
            : undefined;
    const markerColor =
        firstItem && line.staticMarkerColor
            ? (line.staticMarkerColor.get(firstItem).value ?? undefined)
            : undefined;

    const timelineSteps = line.staticTimelineAttribute
        ? buildTimelineSteps(items, line.staticTimelineAttribute, rawPoints, line.aggregationType)
        : undefined;

    return [
        {
            name: line.staticName?.value ?? "Series",
            smooth: line.interpolation === "spline",
            showSymbol: line.lineStyle !== "line",
            lineStyle: line.lineStyle,
            fillArea: line.fillArea ?? false,
            xIsDateTime,
            lineColor,
            markerColor,
            data: points.map(p => [p.x, p.y]),
            tooltips: points.map(p => p.tooltip ?? ""),
            customSeriesOptions: line.customSeriesOptions,
            onClickItems: items,
            timelineSteps
        }
    ];
}

function buildDynamicSeries(line: LinesType): BuiltSeries[] {
    const ds = line.dynamicDataSource;
    if (!ds || ds.status !== "available" || !ds.items) return [];

    const items = ds.items;

    // Group items by the groupByAttribute value
    const groups = new Map<string, ObjectItem[]>();
    for (const item of items) {
        const key = line.groupByAttribute
            ? attributeValueToString(line.groupByAttribute.get(item).value)
            : "default";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }

    const result: BuiltSeries[] = [];

    for (const [groupKey, groupItems] of groups) {
        let xIsDateTime = false;
        const rawPoints: DataPoint[] = groupItems.map(item => {
            const xResult = line.dynamicXAttribute
                ? attributeValueToX(line.dynamicXAttribute.get(item).value)
                : { x: "", isDate: false };
            if (xResult.isDate) xIsDateTime = true;
            return {
                x: xResult.x,
                y: line.dynamicYAttribute
                    ? attributeValueToNumber(line.dynamicYAttribute.get(item).value)
                    : 0,
                tooltip: line.dynamicTooltipHoverText?.get(item).value ?? undefined
            };
        });

        const points = aggregateDataPoints(rawPoints, line.aggregationType);

        const firstItem = groupItems[0];
        const lineColor =
            firstItem && line.dynamicLineColor
                ? (line.dynamicLineColor.get(firstItem).value ?? undefined)
                : undefined;
        const markerColor =
            firstItem && line.dynamicMarkerColor
                ? (line.dynamicMarkerColor.get(firstItem).value ?? undefined)
                : undefined;
        const name =
            firstItem && line.dynamicName
                ? (line.dynamicName.get(firstItem).value ?? groupKey)
                : groupKey;

        const timelineSteps = line.dynamicTimelineAttribute
            ? buildTimelineSteps(groupItems, line.dynamicTimelineAttribute, rawPoints, line.aggregationType)
            : undefined;

        result.push({
            name,
            smooth: line.interpolation === "spline",
            showSymbol: line.lineStyle !== "line",
            lineStyle: line.lineStyle,
            fillArea: line.fillArea ?? false,
            xIsDateTime,
            lineColor,
            markerColor,
            data: points.map(p => [p.x, p.y]),
            tooltips: points.map(p => p.tooltip ?? ""),
            customSeriesOptions: line.customSeriesOptions,
            onClickItems: groupItems,
            timelineSteps
        });
    }

    return result;
}

function buildTimelineSteps(
    items: ObjectItem[],
    timelineAttr: ListAttributeValue<string | boolean | Date | Big>,
    pointsPerItem: DataPoint[],
    aggregationType: AggregationTypeEnum
): TimelineStep[] {
    // Group item indices by their timeline attribute value
    const groups = new Map<string, { indices: number[]; sortValue: string | number }>();

    items.forEach((item, idx) => {
        const raw = timelineAttr.get(item).value;
        let key: string;
        let sortValue: string | number;

        if (raw instanceof Date) {
            sortValue = raw.getTime();
            key = String(sortValue);
        } else if (raw instanceof Big) {
            sortValue = raw.toNumber();
            key = String(sortValue);
        } else if (raw === null || raw === undefined) {
            return; // skip items without a timeline value
        } else {
            key = String(raw);
            sortValue = key;
        }

        if (!groups.has(key)) groups.set(key, { indices: [], sortValue });
        groups.get(key)!.indices.push(idx);
    });

    // Build a TimelineStep per group
    const steps: TimelineStep[] = Array.from(groups.entries()).map(([key, { indices, sortValue }]) => {
        const rawPoints: DataPoint[] = indices.map(i => pointsPerItem[i]);
        const points = aggregateDataPoints(rawPoints, aggregationType);
        return {
            key,
            sortValue,
            data: points.map(p => [p.x, p.y] as [string | number, number]),
            tooltips: points.map(p => p.tooltip ?? "")
        };
    });

    // Sort steps by their sortValue
    steps.sort((a, b) => {
        if (typeof a.sortValue === "number" && typeof b.sortValue === "number") {
            return a.sortValue - b.sortValue;
        }
        return String(a.sortValue) < String(b.sortValue) ? -1 : 1;
    });

    return steps;
}
