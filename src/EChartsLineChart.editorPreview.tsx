import { ReactElement } from "react";
import { EChartsLineChartPreviewProps } from "../typings/EChartsLineChartProps";

const PREVIEW_COLORS = ["#0123C6", "#2DBAFC", "#F2B42A", "#E84B40", "#6AC26F", "#9B59B6"];

const PREVIEW_DATA = [
    [10, 25, 18, 35, 28, 42, 38],
    [22, 15, 30, 20, 38, 25, 32],
    [5, 18, 12, 28, 15, 32, 20]
];

const X_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export function preview(props: EChartsLineChartPreviewProps): ReactElement {
    const { lines, showLegend, width, height, widthUnit, heightUnit } = props;

    const seriesCount = Math.max(lines.length, 1);
    const containerWidth = widthUnit === "pixels" ? `${width ?? 100}px` : `${width ?? 100}%`;
    const containerHeight =
        heightUnit === "pixels"
            ? `${height ?? 300}px`
            : heightUnit === "percentageOfParent"
              ? `${height ?? 75}%`
              : "300px";

    const svgWidth = 400;
    const svgHeight = 250;
    const padL = 40;
    const padR = 20;
    const padT = 20;
    const padB = showLegend ? 50 : 30;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const allValues = PREVIEW_DATA.flat();
    const minY = Math.min(...allValues);
    const maxY = Math.max(...allValues);

    function toSvgX(i: number): number {
        return padL + (i / (X_LABELS.length - 1)) * chartW;
    }
    function toSvgY(v: number): number {
        return padT + chartH - ((v - minY) / (maxY - minY)) * chartH;
    }

    const seriesPaths = Array.from({ length: seriesCount }, (_, si) => {
        const data = PREVIEW_DATA[si % PREVIEW_DATA.length];
        const color = PREVIEW_COLORS[si % PREVIEW_COLORS.length];
        const pts = data.map((v, i) => `${toSvgX(i)},${toSvgY(v)}`).join(" ");
        return { color, pts, name: lines[si]?.staticName ?? `Series ${si + 1}` };
    });

    return (
        <div
            className="widget-echarts widget-echarts-preview"
            style={{ width: containerWidth, height: containerHeight, display: "block" }}
        >
            <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ width: "100%", height: "100%" }}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Y axis */}
                <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#ccc" strokeWidth="1" />
                {/* X axis */}
                <line
                    x1={padL}
                    y1={padT + chartH}
                    x2={padL + chartW}
                    y2={padT + chartH}
                    stroke="#ccc"
                    strokeWidth="1"
                />

                {/* X axis labels */}
                {X_LABELS.map((label, i) => (
                    <text
                        key={label}
                        x={toSvgX(i)}
                        y={padT + chartH + 14}
                        fontSize="9"
                        textAnchor="middle"
                        fill="#888"
                    >
                        {label}
                    </text>
                ))}

                {/* Series lines */}
                {seriesPaths.map(({ color, pts }, si) => (
                    <polyline
                        key={si}
                        points={pts}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                ))}

                {/* Legend */}
                {showLegend &&
                    seriesPaths.map(({ color, name }, si) => {
                        const lx = padL + si * 90;
                        const ly = svgHeight - 14;
                        return (
                            <g key={si}>
                                <rect x={lx} y={ly - 7} width="12" height="4" fill={color} rx="2" />
                                <text x={lx + 16} y={ly} fontSize="9" fill="#555">
                                    {typeof name === "string" ? name : `Series ${si + 1}`}
                                </text>
                            </g>
                        );
                    })}
            </svg>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/EChartsLineChart.css");
}
