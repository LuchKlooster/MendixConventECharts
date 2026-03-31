import { EChartsThemeLoaderPreviewProps } from "../typings/EChartsThemeLoaderProps";

export type Problem = { property?: string; severity?: "error" | "warning" | "deprecation"; message: string };

export function check(values: EChartsThemeLoaderPreviewProps): Problem[] {
    const errors: Problem[] = [];

    if (!values.themeName?.trim()) {
        errors.push({ property: "themeName", severity: "error", message: "Theme name is required." });
    }
    if (values.themeJson) {
        try {
            JSON.parse(values.themeJson);
        } catch {
            errors.push({ property: "themeJson", severity: "error", message: "Must be valid JSON." });
        }
    } else {
        errors.push({ property: "themeJson", severity: "error", message: "Theme JSON is required." });
    }

    return errors;
}
