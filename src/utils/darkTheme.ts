/**
 * Enhanced "dark" theme for ECharts 6.
 *
 * ECharts' built-in dark theme paints secondary text in fairly muted greys:
 *
 *   textStyle / legend / axisLabel / visualMap ... rgb(203,203,206)
 *   tooltip / dataZoom / timeline label .......... rgb(179,180,183)
 *   title subtext ................................ rgb(152,153,157)
 *
 * The chart widgets deliberately do NOT paint the theme background in dark mode
 * (the surrounding page surface shows through), so on a mid-dark surface those
 * greys read as low-contrast. This module takes ECharts' own dark theme, clones
 * it, lightens only the text colours, and re-registers it under the name
 * `"dark"` so it transparently replaces the built-in one.
 */
import darkThemeBase from "echarts/lib/theme/dark.js";

interface EChartsThemeRegistrar {
    registerTheme(name: string, theme: object): void;
}

// Lighter replacements for the built-in dark greys. Kept close to white so the
// text stays readable even when the chart sits on a lighter dark surface.
const TEXT_PRIMARY = "#F4F4F6"; // was rgb(203,203,206)
const TEXT_SECONDARY = "#E4E5E8"; // was rgb(179,180,183)
const TEXT_SUBTLE = "#D4D5D9"; // was rgb(152,153,157) — title subtext

type AnyRecord = Record<string, unknown>;

function deepClone<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(deepClone) as unknown as T;
    }
    if (value && typeof value === "object") {
        const out: AnyRecord = {};
        for (const [k, v] of Object.entries(value as AnyRecord)) {
            out[k] = deepClone(v);
        }
        return out as T;
    }
    return value;
}

/** Sets `obj[path] = color`, creating intermediate objects as needed. */
function setColor(obj: AnyRecord, path: string[], color: string): void {
    let cursor = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (typeof cursor[key] !== "object" || cursor[key] === null) {
            cursor[key] = {};
        }
        cursor = cursor[key] as AnyRecord;
    }
    cursor[path[path.length - 1]] = color;
}

function buildEnhancedDarkTheme(): object {
    const theme = deepClone(darkThemeBase) as AnyRecord;

    setColor(theme, ["textStyle", "color"], TEXT_PRIMARY);
    setColor(theme, ["legend", "textStyle", "color"], TEXT_PRIMARY);
    setColor(theme, ["legend", "pageTextStyle", "color"], TEXT_SECONDARY);
    setColor(theme, ["visualMap", "textStyle", "color"], TEXT_PRIMARY);
    setColor(theme, ["tooltip", "textStyle", "color"], TEXT_PRIMARY);
    setColor(theme, ["dataZoom", "textStyle", "color"], TEXT_SECONDARY);
    setColor(theme, ["timeline", "label", "color"], TEXT_SECONDARY);
    setColor(theme, ["title", "subtextStyle", "color"], TEXT_SUBTLE);

    for (const axisKey of ["timeAxis", "logAxis", "valueAxis", "categoryAxis"]) {
        setColor(theme, [axisKey, "axisLabel", "color"], TEXT_PRIMARY);
        setColor(theme, [axisKey, "axisName", "color"], TEXT_PRIMARY);
    }

    setColor(theme, ["gauge", "title", "color"], TEXT_PRIMARY);
    setColor(theme, ["gauge", "axisLabel", "color"], TEXT_PRIMARY);

    // Per-series-type defaults. ECharts does NOT let series data labels inherit
    // the global `textStyle` colour — bar/line labels default to a dark colour
    // that is nearly invisible on the dark canvas. Theme keys named after the
    // series type set the default for that type (still overridable per series).
    for (const seriesType of ["bar", "line", "scatter", "pie"]) {
        setColor(theme, [seriesType, "label", "color"], TEXT_PRIMARY);
    }

    return theme;
}

let registered = false;

/**
 * Registers the enhanced dark theme under the name `"dark"`, replacing the
 * built-in one. Safe to call multiple times; only the first call does work.
 */
export function registerEnhancedDarkTheme(echarts: EChartsThemeRegistrar): void {
    if (registered) {
        return;
    }
    echarts.registerTheme("dark", buildEnhancedDarkTheme());
    registered = true;
}
