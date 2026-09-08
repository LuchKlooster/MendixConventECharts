/**
 * Local replacement for `@echarts-x/custom-bar-range`'s installer.
 *
 * The upstream `renderItem` hard-codes the min/max value labels to
 * `fill: '#333'` and the unit suffix to `℃`, with no way to change either — so
 * on the dark theme those labels are almost unreadable. This copy is identical
 * to upstream except it reads these optional `itemPayload` keys:
 *
 *   labelColor        – fill for both value labels (default `#333`, as upstream)
 *   labelStrokeColor  – halo/outline colour drawn behind the label text
 *   labelStrokeWidth  – halo/outline width in px (default 0 = no halo)
 *   labelFontSize     – font size for both value labels (default: renderer default)
 *   unit              – suffix appended to each value (default `℃`, as upstream)
 *
 * With none of them set, behaviour matches the upstream package exactly.
 */
import type {
    CustomSeriesRenderItem,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams
} from "echarts";

interface BarRangePayload {
    barWidth?: number | string;
    borderRadius?: number;
    margin?: number;
    labelColor?: string;
    labelStrokeColor?: string;
    labelStrokeWidth?: number;
    labelFontSize?: number;
    unit?: string;
}

const renderItem: CustomSeriesRenderItem = (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
) => {
    const payload = ((params as unknown as { itemPayload?: BarRangePayload }).itemPayload ?? {}) as BarRangePayload;

    const x = api.value(0) as number;
    const valueStart = Number(api.value(1));
    const coordStart = api.coord([x, valueStart]);
    const valueEnd = Number(api.value(2));
    const coordEnd = api.coord([x, valueEnd]);
    const bandWidth = api.coord([1, 0])[0] - api.coord([0, 0])[0];

    let barWidthRaw = payload.barWidth;
    if (barWidthRaw == null) {
        barWidthRaw = "70%";
    }
    const barWidth =
        typeof barWidthRaw === "string" && barWidthRaw.endsWith("%")
            ? (parseFloat(barWidthRaw) / 100) * bandWidth
            : (barWidthRaw as number);

    const borderRadius = payload.borderRadius || 0;
    const margin = payload.margin == null ? 10 : payload.margin;
    const unit = payload.unit == null ? "℃" : payload.unit;
    const labelColor = payload.labelColor || "#333";
    const labelStyle = {
        ...(payload.labelFontSize ? { fontSize: payload.labelFontSize } : {}),
        ...(payload.labelStrokeColor && payload.labelStrokeWidth
            ? { stroke: payload.labelStrokeColor, lineWidth: payload.labelStrokeWidth, strokeFirst: true }
            : {})
    };

    const bar = {
        type: "rect",
        shape: {
            x: coordStart[0] - barWidth / 2,
            y: coordStart[1],
            width: barWidth,
            height: coordEnd[1] - coordStart[1],
            r: borderRadius
        },
        style: {
            fill: api.visual("color")
        }
    };
    const textTop = {
        type: "text",
        x: coordEnd[0],
        y: coordEnd[1] - margin,
        style: {
            text: valueEnd.toString() + unit,
            textAlign: "center",
            textVerticalAlign: "bottom",
            fill: labelColor,
            ...labelStyle
        }
    };
    const textBottom = {
        type: "text",
        x: coordStart[0],
        y: coordStart[1] + margin,
        style: {
            text: valueStart.toString() + unit,
            textAlign: "center",
            textVerticalAlign: "top",
            fill: labelColor,
            ...labelStyle
        }
    };
    return {
        type: "group",
        children: [bar, textTop, textBottom]
    } as ReturnType<CustomSeriesRenderItem>;
};

interface ExtensionRegisters {
    registerCustomSeries(seriesType: string, render: CustomSeriesRenderItem): void;
}

const installer = {
    install(registers: ExtensionRegisters): void {
        registers.registerCustomSeries("barRange", renderItem);
    }
};

// echarts' `use()` and `EChartsExtensionInstallRegisters` types come from a
// different copy of the echarts .d.ts than `echarts/core` resolves, so a
// precisely-typed installer still fails to assign. The upstream package ships
// no types at all (its default export is implicitly `any`); mirror that here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const barRangeInstaller: any = installer;
