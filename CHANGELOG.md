# Changelog

## [1.3.2] - 2026-09-08

### Fixes

- **Dark mode text contrast** — The built-in ECharts `dark` theme is now replaced by an enhanced version that paints all secondary text near-white (`#F4F4F6` / `#E4E5E8` / `#D4D5D9`) instead of the muted greys, so axis labels, legend, axis names, tooltips and data labels stay readable on the dark canvas. Applies automatically when the widget's **Dark mode** is on.
- **Bar range data labels** — The bundled `barRange` custom series previously drew its min/max value labels with a hard-coded dark grey (`#333`), unreadable in dark mode and not overridable. It is now rendered by a local copy that honours `itemPayload.labelColor`, `itemPayload.labelStrokeColor`, `itemPayload.labelStrokeWidth`, `itemPayload.labelFontSize` and `itemPayload.unit`. The Bar chart now sets a mode-appropriate `labelColor` (light on dark, dark on light) plus an opposite-luminance halo so the values stay readable both on the chart canvas and on top of a coloured bar, in either theme. Override per series via **Custom series options**: `{ "itemPayload": { "labelColor": "#RRGGBB", "labelStrokeColor": "transparent" } }`.

---

## [1.3.1] - 2026-04-12

### New features

- **Bar range chart support** — The `@echarts-x/custom-bar-range` package is now bundled and registered in all four chart widgets. Use a bar range chart by setting `"type": "custom"` and `"renderItem": "barRange"` inside **Custom chart option** — no additional configuration in Studio Pro required. Data format: `[xIndex, lowerBound, upperBound]` per data point.

---

## [1.3.0] - 2026-04-12

### Dependency upgrade

- **Apache ECharts v6** — The underlying charting library has been upgraded from v5.6 to v6.0. All existing widget options, component imports, and the public API (`init`, `setOption`, `resize`, `dispose`, `on`, `off`, `registerTheme`) are unchanged. No widget configuration changes are required.

  Notable ECharts v6 behavioural changes to be aware of:
  - The default color palette and legend position have changed. To restore the v5 appearance, initialize the chart with theme `"v5"` via **Custom init options**: `{"renderer":"canvas"}` and set **Theme name** to `v5`.
  - Axis labels now have overlap prevention enabled by default. Disable it per axis with `{"xAxis":{"axisLabel":{"nameMoveOverlap":false}}}` in **Custom chart option** if needed.

---

## [1.2.2] - 2026-04-05

### New features

- **Race animation** (Line chart) — A new **Enable race animation** toggle switches the Line chart into cumulative race mode. Data from successive timeline steps is revealed one step at a time, creating an animated "line race" effect. Useful for visualising how values accumulate over time (e.g. GDP per country per year, cumulative sales per region). Requires a **Timeline attribute** on each series. Configure speed with **Race play interval (ms)** and enable **Race loop** to restart automatically.

- **Secondary Y-axis** (Line and Bar charts) — Each series now has a **Y axis index** property (`0` = primary/left, `1` = secondary/right). Define the second axis in **Custom chart option** to plot series with different scales on the same chart.

- **Unit suffix in tooltips** (Line and Bar charts) — Each series now has a **Unit** text property. The value is appended to the Y value in the tooltip, e.g. `42 km/h` or `15 %`. No custom formatter required.

- **Mixed series types** — Each series entry in the Line chart now has a **Series type** property (**Line** or **Bar**), and each series in the Bar chart has a **Series type** property (**Bar** or **Line**). This makes it straightforward to create combo charts (bars + lines on a shared axis) without a custom chart option.

---

## [1.2.1] - 2026-04-01

### Bug fixes

- Minor stability fixes for series data handling with empty or partially loaded data sources.

---

## [1.2.0] - 2026-03-31

### New features

- **Toolbox** — All four chart widgets now have a **Show toolbox** boolean property. When enabled, ECharts renders its built-in toolbox in the top-right corner with three tools: *Data view* (raw data table), *Restore* (reset zoom/pan), and *Save as image* (download as PNG). For a custom toolbox configuration use the existing *Custom chart option* field.

- **Custom series options — Pie chart** — The *Custom series options* JSON field on each pie/donut ring series is now fully wired through to the ECharts series configuration. Previously the property was visible in Studio Pro but had no effect at runtime. Use it to apply Nightingale rose type, border radius, item styles, and any other ECharts pie series option:

  ```json
  {
    "roseType": "area",
    "itemStyle": { "borderRadius": 8 }
  }
  ```

### Bug fixes

- **Width not filling available space** — Charts configured at 100% width could render narrower than their container in certain Mendix layout contexts. The inner chart container now uses `position: absolute; inset: 0` instead of `width/height: 100%`, which correctly fills the outer container regardless of how its height is computed. Added `min-width: 0` to prevent overflow in flex layouts.

---

## [1.1.1] - 2026-03-22

### Bug fixes

- Minor stability fixes for timeline data source handling.

---

## [1.1.0] - 2026-03-21

### New features

- **Timeline** — Line and Bar charts support an animated timeline slider. Each unique value of a *Timeline attribute* becomes one step; configurable auto-play, loop, rewind, and play interval.
- **Color dimension** — Bar chart series support an optional *Color dimension attribute* for per-bar coloring via ECharts `visualMap`, independent of bar height.
- **Multi-series Gauge** — Gauge chart supports up to three independent context-mode series on a single dial, and a list-mode multi-needle configuration driven by a Mendix data source.
- **Polar line chart** — Line chart series support polar coordinate systems via *Custom series options* (`"coordinateSystem": "polar"`).
- **ECharts Theme Loader** — New helper widget that registers an ECharts color theme at runtime and notifies all chart widgets on the page to reinitialize with it.

---

## [1.0.0] - Initial release

- ECharts Line chart
- ECharts Bar chart
- ECharts Pie / Donut chart
- ECharts Gauge chart
