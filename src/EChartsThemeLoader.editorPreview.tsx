import { ReactElement } from "react";
import { EChartsThemeLoaderPreviewProps } from "../typings/EChartsThemeLoaderProps";

export function preview({ themeName }: EChartsThemeLoaderPreviewProps): ReactElement {
    const label = themeName?.trim() ? `ECharts theme: "${themeName}"` : "ECharts Theme Loader";
    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            border: "1px dashed #aaa",
            borderRadius: 4,
            background: "#f5f5f5",
            color: "#555",
            fontSize: 12,
            fontFamily: "sans-serif"
        }}>
            <span style={{ fontSize: 14 }}>🎨</span>
            {label}
        </div>
    );
}

export function getPreviewCss(): string {
    return "";
}
