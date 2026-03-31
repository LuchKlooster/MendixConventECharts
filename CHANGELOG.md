# Changelog

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
