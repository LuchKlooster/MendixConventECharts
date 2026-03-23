type Properties = PropertyGroup[];
type PropertyGroup = { caption: string; propertyGroups?: PropertyGroup[]; properties?: Property[] };
type Property = { key: string; caption: string; description?: string; objects?: ObjectProperties[]; properties?: Properties[] };
type ObjectProperties = { properties: PropertyGroup[]; captions?: string[] };
export type Problem = { property?: string; severity?: "error" | "warning" | "deprecation"; message: string };

function hideInObject(properties: Properties, objectKey: string, objectIndex: number, keys: string[]): void {
    for (const group of properties) {
        for (const prop of group.properties ?? []) {
            if (prop.key === objectKey && prop.objects?.[objectIndex]) {
                const obj = prop.objects[objectIndex];
                for (const objGroup of obj.properties) {
                    objGroup.properties = objGroup.properties?.filter(p => !keys.includes(p.key));
                    for (const sg of objGroup.propertyGroups ?? []) {
                        sg.properties = sg.properties?.filter(p => !keys.includes(p.key));
                    }
                }
            }
        }
        for (const subGroup of group.propertyGroups ?? []) {
            hideInObject([subGroup], objectKey, objectIndex, keys);
        }
    }
}

function hideProperties(properties: Properties, keys: string[]): void {
    for (const group of properties) {
        group.properties = group.properties?.filter(p => !keys.includes(p.key));
        for (const subGroup of group.propertyGroups ?? []) hideProperties([subGroup], keys);
    }
}

export function getProperties(values: any, defaultProperties: Properties): Properties {
    values.series?.forEach((s: any, i: number) => {
        if (s.dataSet === "static") {
            hideInObject(defaultProperties, "series", i, [
                "dynamicDataSource", "groupByAttribute", "dynamicName",
                "dynamicXAttribute", "dynamicYAttribute", "dynamicTooltipHoverText",
                "dynamicBarColor", "dynamicOnClickAction", "dynamicTimelineAttribute"
            ]);
        } else {
            hideInObject(defaultProperties, "series", i, [
                "staticDataSource", "staticName", "staticXAttribute", "staticYAttribute",
                "staticTooltipHoverText", "staticBarColor", "staticOnClickAction", "staticTimelineAttribute"
            ]);
        }
    });

    if (!values.enableAdvancedOptions) {
        hideProperties(defaultProperties, ["customLayout", "customConfigurations"]);
    }
    if (!values.enableTimeline) {
        hideProperties(defaultProperties, [
            "timelineDateFormat", "timelineAutoPlay", "timelineLoop",
            "timelinePlayInterval", "timelineRewind"
        ]);
    }

    return defaultProperties;
}

export function check(values: any): Problem[] {
    const errors: Problem[] = [];
    values.series?.forEach((s: any, i: number) => {
        if (s.dataSet === "static" && !s.staticDataSource) {
            errors.push({ property: `series/${i + 1}/staticDataSource`, message: "A data source is required.", severity: "error" });
        } else if (s.dataSet === "dynamic" && !s.dynamicDataSource) {
            errors.push({ property: `series/${i + 1}/dynamicDataSource`, message: "A data source is required.", severity: "error" });
        }
        if (s.customSeriesOptions) {
            try { JSON.parse(s.customSeriesOptions); } catch {
                errors.push({ property: `series/${i + 1}/customSeriesOptions`, message: "Must be valid JSON.", severity: "error" });
            }
        }
    });
    if (values.customLayout) {
        try { JSON.parse(values.customLayout); } catch {
            errors.push({ property: "customLayout", message: "Must be valid JSON.", severity: "error" });
        }
    }
    return errors;
}
