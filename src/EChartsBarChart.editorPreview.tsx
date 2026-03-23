import { ReactElement } from "react";

const COLORS = ["#0123C6", "#2DBAFC", "#F2B42A", "#E84B40", "#6AC26F"];
const CATEGORIES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const PREVIEW_DATA = [
    [28, 42, 35, 55, 48, 62],
    [18, 30, 22, 38, 30, 45]
];

export function preview(props: any): ReactElement {
    const { series = [], showLegend = true, width, height, widthUnit, heightUnit, stack = false } = props;

    const containerWidth = widthUnit === "pixels" ? `${width ?? 100}px` : `${width ?? 100}%`;
    const containerHeight = heightUnit === "pixels" ? `${height ?? 300}px` : heightUnit === "percentageOfParent" ? `${height ?? 75}%` : "260px";

    const seriesCount = Math.max(series.length, 1);
    const svgW = 380, svgH = 230;
    const padL = 40, padR = 15, padT = 15, padB = showLegend ? 45 : 25;
    const chartW = svgW - padL - padR, chartH = svgH - padT - padB;

    const allValues = PREVIEW_DATA.flat();
    const maxVal = stack
        ? Math.max(...CATEGORIES.map((_, ci) => Array.from({ length: seriesCount }, (__, si) => (PREVIEW_DATA[si % PREVIEW_DATA.length][ci] ?? 0)).reduce((a, b) => a + b, 0)))
        : Math.max(...allValues);

    const barGroupW = chartW / CATEGORIES.length;
    const barPad = barGroupW * 0.15;
    const barW = stack ? barGroupW - barPad * 2 : (barGroupW - barPad * 2) / seriesCount;

    return (
        <div className="widget-echarts widget-echarts-preview"
            style={{ width: containerWidth, height: containerHeight, display: "block" }}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
                {/* Axes */}
                <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#ccc" strokeWidth="1" />
                <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#ccc" strokeWidth="1" />

                {/* Bars */}
                {CATEGORIES.map((cat, ci) => {
                    const groupX = padL + ci * barGroupW + barPad;
                    let stackOffset = 0;
                    return (
                        <g key={cat}>
                            {Array.from({ length: seriesCount }, (_, si) => {
                                const val = PREVIEW_DATA[si % PREVIEW_DATA.length][ci] ?? 0;
                                const barH = (val / maxVal) * chartH;
                                const color = COLORS[si % COLORS.length];
                                const bx = stack ? groupX : groupX + si * barW;
                                const by = padT + chartH - barH - stackOffset;
                                if (stack) stackOffset += barH;
                                return <rect key={si} x={bx} y={by} width={barW} height={barH} fill={color} rx="2" />;
                            })}
                            <text x={groupX + (stack ? barW : barW * seriesCount) / 2} y={padT + chartH + 12} fontSize="9" textAnchor="middle" fill="#888">{cat}</text>
                        </g>
                    );
                })}

                {/* Legend */}
                {showLegend && Array.from({ length: seriesCount }, (_, si) => {
                    const lx = padL + si * 90;
                    const ly = svgH - 10;
                    const name = series[si]?.staticName ?? `Series ${si + 1}`;
                    return (
                        <g key={si}>
                            <rect x={lx} y={ly - 7} width="12" height="8" fill={COLORS[si % COLORS.length]} rx="2" />
                            <text x={lx + 16} y={ly} fontSize="9" fill="#555">{typeof name === "string" ? name : `Series ${si + 1}`}</text>
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
