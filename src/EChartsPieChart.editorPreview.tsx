import { ReactElement } from "react";

const COLORS = ["#0123C6", "#2DBAFC", "#F2B42A", "#E84B40", "#6AC26F", "#9B59B6"];
const PREVIEW_SLICES = [
    { name: "Alpha", value: 35 },
    { name: "Beta",  value: 25 },
    { name: "Gamma", value: 20 },
    { name: "Delta", value: 12 },
    { name: "Other", value: 8  }
];

export function preview(props: any): ReactElement {
    const {
        widthUnit, width, heightUnit, height,
        showLegend = true,
        donut = false,
        roseType = false
    } = props;

    const containerWidth  = widthUnit  === "pixels" ? `${width  ?? 100}px` : `${width  ?? 100}%`;
    const containerHeight = heightUnit === "pixels"
        ? `${height ?? 300}px`
        : heightUnit === "percentageOfParent"
            ? `${height ?? 75}%`
            : "260px";

    const svgW = 280, svgH = 230;
    const cx = 110, cy = svgH / 2;
    const outerR = 80;
    const innerR = donut ? 40 : 0;

    const total = PREVIEW_SLICES.reduce((s, p) => s + p.value, 0);
    const maxVal = Math.max(...PREVIEW_SLICES.map(p => p.value));

    let angle = -Math.PI / 2;
    const slicePaths = PREVIEW_SLICES.map((slice, i) => {
        const frac = slice.value / total;
        const sweep = frac * 2 * Math.PI;
        const r = roseType ? innerR + (outerR - innerR) * (slice.value / maxVal) : outerR;
        const x1 = cx + Math.cos(angle) * r;
        const y1 = cy + Math.sin(angle) * r;
        const xi = cx + Math.cos(angle) * innerR;
        const yi = cy + Math.sin(angle) * innerR;
        angle += sweep;
        const x2 = cx + Math.cos(angle) * r;
        const y2 = cy + Math.sin(angle) * r;
        const xio = cx + Math.cos(angle) * innerR;
        const yio = cy + Math.sin(angle) * innerR;
        const large = sweep > Math.PI ? 1 : 0;

        const d = innerR > 0
            ? `M ${xi} ${yi} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xio} ${yio} A ${innerR} ${innerR} 0 ${large} 0 ${xi} ${yi} Z`
            : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

        return <path key={i} d={d} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />;
    });

    const legendStartX = 205;

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
                {slicePaths}

                {showLegend && PREVIEW_SLICES.map((slice, i) => (
                    <g key={i}>
                        <rect
                            x={legendStartX}
                            y={20 + i * 18}
                            width="10" height="10"
                            fill={COLORS[i % COLORS.length]}
                            rx="2"
                        />
                        <text x={legendStartX + 14} y={29 + i * 18} fontSize="9" fill="#555">
                            {slice.name}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/EChartsLineChart.css");
}
