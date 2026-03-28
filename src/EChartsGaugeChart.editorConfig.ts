type Properties = PropertyGroup[];
type PropertyGroup = { caption: string; propertyGroups?: PropertyGroup[]; properties?: Property[] };
type Property = { key: string; caption: string; description?: string; objects?: ObjectProperties[]; properties?: Properties[] };
type ObjectProperties = { properties: PropertyGroup[]; captions?: string[] };
export type Problem = { property?: string; severity?: "error" | "warning" | "deprecation"; message: string };

function hideProperties(properties: Properties, keys: string[]): void {
    for (const group of properties) {
        group.properties = group.properties?.filter(p => !keys.includes(p.key));
        for (const subGroup of group.propertyGroups ?? []) hideProperties([subGroup], keys);
    }
}

const LIST_PROPS = ["dataSource", "listValueAttribute", "listLabelAttribute", "listCustomOptions"];
const CONTEXT_PROPS = [
    "valueAttribute", "labelAttribute", "series1CustomOptions",
    "valueAttribute2", "labelAttribute2", "series2Min", "series2Max", "series2CustomOptions",
    "valueAttribute3", "labelAttribute3", "series3Min", "series3Max", "series3CustomOptions"
];

export function getProperties(values: any, defaultProperties: Properties): Properties {
    if (values.useListMode) {
        hideProperties(defaultProperties, CONTEXT_PROPS);
    } else {
        hideProperties(defaultProperties, LIST_PROPS);
    }
    if (!values.showLegend) {
        hideProperties(defaultProperties, ["legendPosition"]);
    }
    if (!values.enableAdvancedOptions) {
        hideProperties(defaultProperties, ["customLayout", "customConfigurations"]);
    }
    return defaultProperties;
}

export function check(values: any): Problem[] {
    const errors: Problem[] = [];

    if (values.useListMode && !values.dataSource) {
        errors.push({ property: "dataSource", message: "A data source is required in list mode.", severity: "error" });
    }
    if (values.colorRanges) {
        try { JSON.parse(values.colorRanges); } catch {
            errors.push({ property: "colorRanges", message: "Must be valid JSON, e.g. [[0.3,\"#67e0e3\"],[1,\"#fd666d\"]].", severity: "error" });
        }
    }
    if (values.customLayout) {
        try { JSON.parse(values.customLayout); } catch {
            errors.push({ property: "customLayout", message: "Must be valid JSON.", severity: "error" });
        }
    }
    if (values.min >= values.max) {
        errors.push({ property: "max", message: "Maximum must be greater than minimum.", severity: "error" });
    }
    for (const [key, minKey, maxKey] of [
        ["series1CustomOptions", null, null],
        ["series2CustomOptions", "series2Min", "series2Max"],
        ["series3CustomOptions", "series3Min", "series3Max"],
        ["listCustomOptions", null, null]
    ] as [string, string | null, string | null][]) {
        if (values[key]) {
            try { JSON.parse(values[key]); } catch {
                errors.push({ property: key, message: "Must be valid JSON.", severity: "error" });
            }
        }
        if (minKey && maxKey && values[minKey] >= values[maxKey]) {
            errors.push({ property: maxKey, message: "Maximum must be greater than minimum.", severity: "error" });
        }
    }
    return errors;
}
