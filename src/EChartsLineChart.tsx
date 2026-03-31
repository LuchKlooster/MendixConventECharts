import { ReactElement, useCallback, CSSProperties } from "react";
import { EChartsLineChartContainerProps } from "../typings/EChartsLineChartProps";
import { LineChart } from "./components/LineChart";
import { buildSeries } from "./utils/seriesBuilder";
import "./ui/EChartsLineChart.css";

export function EChartsLineChart(props: EChartsLineChartContainerProps): ReactElement {
    const {
        lines,
        xAxisLabel,
        yAxisLabel,
        showLegend,
        legendPosition,
        showToolbox,
        gridLines,
        xAxisDateFormat,
        backgroundColor,
        enableTimeline,
        timelineDateFormat,
        timelineAutoPlay,
        timelineLoop,
        timelinePlayInterval,
        timelineRewind,
        widthUnit,
        width,
        heightUnit,
        height,
        themeName,
        customLayout,
        customConfigurations,
        class: className,
        style
    } = props;

    const series = buildSeries(lines);

    const onDataPointClick = useCallback(
        (seriesIndex: number, dataIndex: number) => {
            const builtSeries = series[seriesIndex];
            if (!builtSeries) return;
            const clickedItem = builtSeries.onClickItems[dataIndex];
            if (!clickedItem) return;

            const line = lines[seriesIndex];
            if (!line) return;

            if (line.dataSet === "static" && line.staticOnClickAction) {
                const action = line.staticOnClickAction.get(clickedItem);
                if (action.canExecute) action.execute();
            } else if (line.dataSet === "dynamic" && line.dynamicOnClickAction) {
                const action = line.dynamicOnClickAction.get(clickedItem);
                if (action.canExecute) action.execute();
            }
        },
        [series, lines]
    );

    const containerStyle = buildContainerStyle(widthUnit, width, heightUnit, height, style);

    return (
        <div className={`widget-echarts ${className}`} style={containerStyle}>
            <LineChart
                series={series}
                xAxisLabel={xAxisLabel?.value ?? ""}
                yAxisLabel={yAxisLabel?.value ?? ""}
                showLegend={showLegend}
                legendPosition={legendPosition}
                showToolbox={showToolbox}
                gridLines={gridLines}
                xAxisDateFormat={xAxisDateFormat || undefined}
                backgroundColor={backgroundColor || undefined}
                timelineConfig={enableTimeline ? {
                    autoPlay: timelineAutoPlay,
                    loop: timelineLoop,
                    playInterval: timelinePlayInterval,
                    rewind: timelineRewind,
                    dateFormat: timelineDateFormat || undefined
                } : undefined}
                themeName={themeName || undefined}
                customOption={customLayout || undefined}
                customInitOptions={customConfigurations || undefined}
                onDataPointClick={onDataPointClick}
                width={widthUnit === "pixels" ? `${width}px` : `${width}%`}
                height={heightUnit === "pixels" ? `${height}px` : `${height}%`}
            />
        </div>
    );
}

function buildContainerStyle(
    widthUnit: "percentage" | "pixels",
    width: number,
    heightUnit: "percentageOfWidth" | "pixels" | "percentageOfParent",
    height: number,
    extraStyle?: CSSProperties
): CSSProperties {
    const style: CSSProperties = { ...extraStyle };

    style.width = widthUnit === "pixels" ? `${width}px` : `${width}%`;

    if (heightUnit === "pixels") {
        style.height = `${height}px`;
    } else if (heightUnit === "percentageOfParent") {
        style.height = `${height}%`;
    } else {
        // percentageOfWidth: use aspect-ratio trick via paddingTop on a wrapper
        // We set an explicit aspect-ratio so ECharts can measure the container
        style.aspectRatio = `100 / ${height}`;
        style.height = "auto";
    }

    return style;
}
