import { ReactElement } from "react";

// Converts an ECharts gauge angle (CCW degrees from 3 o'clock) to SVG [x, y]
function angleToPoint(cx: number, cy: number, r: number, echartsDeg: number): [number, number] {
    const rad = (echartsDeg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

// Builds an SVG arc path from startDeg to endDeg (ECharts convention), going clockwise
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    // Clockwise in ECharts = decreasing angle
    const [x1, y1] = angleToPoint(cx, cy, r, startDeg);
    const [x2, y2] = angleToPoint(cx, cy, r, endDeg);
    const sweep = ((startDeg - endDeg) + 360) % 360;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function preview(props: any): ReactElement {
    const {
        widthUnit, width, heightUnit, height,
        min = 0, max = 100, units = "",
        startAngle = 225, endAngle = -45
    } = props;

    const containerWidth  = widthUnit  === "pixels" ? `${width  ?? 100}px` : `${width  ?? 100}%`;
    const containerHeight = heightUnit === "pixels"
        ? `${height ?? 300}px`
        : heightUnit === "percentageOfParent"
            ? `${height ?? 75}%`
            : "260px";

    const svgW = 240, svgH = 220;
    const cx = svgW / 2, cy = svgH / 2 + 10;
    const outerR = 85, innerR = 68;
    const sampleValue = min + (max - min) * 0.65;

    // Arc angle at sample value (65% of range)
    const totalSweep = ((startAngle - endAngle) + 360) % 360;
    const sampleAngle = startAngle - totalSweep * 0.65;

    // Tick marks (10 splits)
    const splits = 10;
    const ticks = Array.from({ length: splits + 1 }, (_, i) => {
        const a = startAngle - (totalSweep * i) / splits;
        const [ox, oy] = angleToPoint(cx, cy, outerR + 2, a);
        const [ix, iy] = angleToPoint(cx, cy, outerR + 10, a);
        return <line key={i} x1={ox} y1={oy} x2={ix} y2={iy} stroke="#aaa" strokeWidth="1.5" />;
    });

    // Needle end point
    const [nx, ny] = angleToPoint(cx, cy, innerR - 8, sampleAngle);

    return (
        <div
            className="widget-echarts widget-echarts-preview"
            style={{ width: containerWidth, height: containerHeight, display: "block" }}
        >
            <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                style={{ width: "100%", height: "100%" }}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Background arc */}
                <path
                    d={arcPath(cx, cy, outerR, startAngle, endAngle)}
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
                {/* Progress arc */}
                <path
                    d={arcPath(cx, cy, outerR, startAngle, sampleAngle)}
                    fill="none"
                    stroke="#5470c6"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
                {/* Tick marks */}
                {ticks}
                {/* Needle */}
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#333" strokeWidth="2" strokeLinecap="round" />
                {/* Center cap */}
                <circle cx={cx} cy={cy} r="6" fill="#5470c6" />
                <circle cx={cx} cy={cy} r="3" fill="#fff" />
                {/* Value */}
                <text x={cx} y={cy + 28} fontSize="16" fontWeight="bold" textAnchor="middle" fill="#333">
                    {Math.round(sampleValue)}{units ? ` ${units}` : ""}
                </text>
                {/* Min / Max labels */}
                {(() => {
                    const [minX, minY] = angleToPoint(cx, cy, outerR + 18, startAngle);
                    const [maxX, maxY] = angleToPoint(cx, cy, outerR + 18, endAngle);
                    return (
                        <>
                            <text x={minX} y={minY + 4} fontSize="9" textAnchor="middle" fill="#888">{min}</text>
                            <text x={maxX} y={maxY + 4} fontSize="9" textAnchor="middle" fill="#888">{max}</text>
                        </>
                    );
                })()}
            </svg>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/EChartsLineChart.css");
}
