import { EChartsLineChartPreviewProps } from "../typings/EChartsLineChartProps";

export type Platform = "web" | "desktop";

export type Properties = PropertyGroup[];

type PropertyGroup = {
    caption: string;
    propertyGroups?: PropertyGroup[];
    properties?: Property[];
};

type Property = {
    key: string;
    caption: string;
    description?: string;
    objectHeaders?: string[];
    objects?: ObjectProperties[];
    properties?: Properties[];
};

type ObjectProperties = {
    properties: PropertyGroup[];
    captions?: string[];
};

export type Problem = {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
};

// Helper to hide a property inside a list object
function hideInObject(
    properties: Properties,
    objectKey: string,
    objectIndex: number,
    propertyKeys: string[]
): void {
    for (const group of properties) {
        for (const prop of group.properties ?? []) {
            if (prop.key === objectKey && prop.objects?.[objectIndex]) {
                const obj = prop.objects[objectIndex];
                for (const objGroup of obj.properties) {
                    objGroup.properties = objGroup.properties?.filter(
                        p => !propertyKeys.includes(p.key)
                    );
                    for (const subGroup of objGroup.propertyGroups ?? []) {
                        subGroup.properties = subGroup.properties?.filter(
                            p => !propertyKeys.includes(p.key)
                        );
                    }
                }
            }
        }
        for (const subGroup of group.propertyGroups ?? []) {
            hideInObject([subGroup], objectKey, objectIndex, propertyKeys);
        }
    }
}

// Helper to hide top-level properties
function hideProperties(properties: Properties, keys: string[]): void {
    for (const group of properties) {
        group.properties = group.properties?.filter(p => !keys.includes(p.key));
        for (const subGroup of group.propertyGroups ?? []) {
            hideProperties([subGroup], keys);
        }
    }
}

export function getProperties(
    values: EChartsLineChartPreviewProps,
    defaultProperties: Properties
): Properties {
    values.lines.forEach((line, i) => {
        if (line.dataSet === "static") {
            hideInObject(defaultProperties, "lines", i, [
                "dynamicDataSource",
                "groupByAttribute",
                "dynamicName",
                "dynamicXAttribute",
                "dynamicYAttribute",
                "dynamicTooltipHoverText",
                "dynamicLineColor",
                "dynamicMarkerColor",
                "dynamicOnClickAction"
            ]);
        } else {
            hideInObject(defaultProperties, "lines", i, [
                "staticDataSource",
                "staticName",
                "staticXAttribute",
                "staticYAttribute",
                "staticTooltipHoverText",
                "staticLineColor",
                "staticMarkerColor",
                "staticOnClickAction"
            ]);
        }

        if (line.lineStyle !== "custom") {
            hideInObject(defaultProperties, "lines", i, ["customSeriesOptions"]);
        }
    });

    if (!values.enableAdvancedOptions) {
        hideProperties(defaultProperties, ["customLayout", "customConfigurations"]);
    }

    return defaultProperties;
}

export function check(values: EChartsLineChartPreviewProps): Problem[] {
    const errors: Problem[] = [];

    const hasCustomLayout = !!values.customLayout?.trim();

    values.lines.forEach((line, i) => {
        if (hasCustomLayout) {
            // Custom chart option provides the full chart definition — datasource not required
            return;
        }
        if (line.dataSet === "static") {
            if (!line.staticDataSource) {
                errors.push({
                    property: `lines/${i + 1}/staticDataSource`,
                    message: "A data source is required for each single-series line.",
                    severity: "error"
                });
            }
        } else {
            if (!line.dynamicDataSource) {
                errors.push({
                    property: `lines/${i + 1}/dynamicDataSource`,
                    message: "A data source is required for each multi-series line.",
                    severity: "error"
                });
            }
        }

        if (line.lineStyle === "custom" && line.customSeriesOptions) {
            try {
                JSON.parse(line.customSeriesOptions);
            } catch {
                errors.push({
                    property: `lines/${i + 1}/customSeriesOptions`,
                    message: "Custom series options must be valid JSON.",
                    severity: "error"
                });
            }
        }
    });

    if (values.customLayout) {
        try {
            JSON.parse(values.customLayout);
        } catch {
            errors.push({
                property: "customLayout",
                message: "Custom chart option must be valid JSON.",
                severity: "error"
            });
        }
    }

    if (values.customConfigurations) {
        try {
            JSON.parse(values.customConfigurations);
        } catch {
            errors.push({
                property: "customConfigurations",
                message: "Custom init options must be valid JSON.",
                severity: "error"
            });
        }
    }

    return errors;
}
