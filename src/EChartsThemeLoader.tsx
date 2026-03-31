import { ReactElement, useEffect, useRef } from "react";
import { EChartsThemeLoaderContainerProps } from "../typings/EChartsThemeLoaderProps";

// Key used to share the theme registry across widget bundles via window.
// Each widget bundle has its own ECharts instance; window is the only shared space.
const REGISTRY_KEY = "__echartsThemeRegistry";
const EVENT_NAME = "echarts-theme-registered";

export function EChartsThemeLoader({ themeName, themeJson }: EChartsThemeLoaderContainerProps): ReactElement {
    const lastRegistered = useRef<{ name: string; json: string } | null>(null);

    // Store the parsed theme in the global registry during render (parent renders
    // before children in a single tree, so this runs before any chart's useEffect).
    // Chart widgets read from this registry and register the theme on their own
    // ECharts instance before calling echarts.init().
    if (themeName?.trim() && themeJson) {
        const changed =
            !lastRegistered.current ||
            lastRegistered.current.name !== themeName ||
            lastRegistered.current.json !== themeJson;

        if (changed) {
            try {
                const theme = JSON.parse(themeJson) as object;
                if (!(window as any)[REGISTRY_KEY]) (window as any)[REGISTRY_KEY] = {};
                ((window as any)[REGISTRY_KEY] as Record<string, object>)[themeName] = theme;
                lastRegistered.current = { name: themeName, json: themeJson };
            } catch { /* parse error reported in effect below */ }
        }
    }

    useEffect(() => {
        if (!themeName?.trim()) {
            console.warn("[EChartsThemeLoader] Theme name is empty — skipping registration.");
            return;
        }
        if (!themeJson) {
            console.warn("[EChartsThemeLoader] Theme JSON is empty — skipping registration.");
            return;
        }
        try {
            JSON.parse(themeJson); // validate
            // Notify any already-mounted chart widgets to reinitialize with the theme.
            window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { themeName } }));
        } catch {
            console.error("[EChartsThemeLoader] Invalid theme JSON — could not register theme.");
        }
    }, [themeName, themeJson]);

    return <></>;
}
