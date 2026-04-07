# ConventECharts — Mendix Widget Package

![ConventSystems](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/CS64x64.png)............![ECharts](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsLogo.png)

**ConventECharts** is a collection of high-quality, data-driven chart widgets for Mendix, built on top of [Apache ECharts](https://echarts.apache.org/) v5. ECharts is a mature, production-ready charting library used worldwide, offering smooth animations, rich interactivity (tooltips, zoom, click events), and exceptional rendering performance via an HTML5 canvas.

The package ships five widgets:

| Widget | Use case |
| --- | --- |
| ECharts Line chart | Trends over time, comparisons between series |
| ECharts Bar chart | Category comparisons, vertical or horizontal |
| ECharts Pie / Donut chart | Part-to-whole relationships |
| ECharts Gauge chart | Speedometer / multi-needle gauge; up to 3 independent series on one dial |
| ECharts Theme Loader | Registers an ECharts color theme so all chart widgets on the page use your application's brand colors |

All widgets share a consistent design: connect a Mendix data source, map attributes, and optionally fine-tune with a JSON override — no custom JavaScript required.

Theme support lets every chart pick up the colors, fonts, and axis styles of your Mendix Atlas UI theme automatically. See **[docs/theming.md](docs/theming.md)** for a complete guide.

A demo Mendix project is available at **[github.com/LuchKlooster/MendixConventEChartsDemo](https://github.com/LuchKlooster/MendixConventEChartsDemo)**.    
Demo project is live to be seen at **[https://echartsdemo100-sandbox.mxapps.io/index.html](https://echartsdemo100-sandbox.mxapps.io/index.html)**.

---


## Common concepts


### Data set modes

The Line and Bar charts support two modes per series, selectable via **Data set**:

- **Single series** — one data source, one line or bar group. Use this when each record is one data point.
- **Multiple series** — one data source split into series by a **Group by** attribute. All records go into one query; ECharts divides them by the group value automatically.


### Aggregation

When multiple records share the same X / category value, the widget can aggregate before rendering. Available functions: None, Count, Sum, Average, Minimum, Maximum, Median, Mode, First, Last. Set to **None** if your data is already aggregated.


### Legend

All four widgets support showing or hiding the legend. Position can be set to **Top**, **Bottom**, **Left**, or **Right**. Left/Right positions use a vertical legend orientation; the chart grid automatically adjusts its margins to prevent overlap.


### Toolbox

All four widgets have a **Show toolbox** toggle. When enabled, ECharts renders its built-in toolbox in the top-right corner of the chart with three tools:

| Tool | Description |
| --- | --- |
| Data view | Opens a table of the raw series data in a modal overlay |
| Restore | Resets the chart to its original state (zoom, pan, highlight) |
| Save as image | Downloads the chart canvas as a PNG file |

For a customized toolbox — adding tools such as **Magic type** (line/bar toggle), **Data zoom**, or **Brush** — leave **Show toolbox** off and configure the toolbox via **Custom chart option** instead:

```json
{
  "toolbox": {
    "feature": {
      "magicType": { "show": true, "type": ["line", "bar"] },
      "dataZoom": { "show": true },
      "saveAsImage": { "show": true }
    }
  }
}
```


### Dimensions

Each widget has an independent **Width** and **Height** setting:

- Width unit: **Percentage** (of parent) or **Pixels**
- Height unit: **Percentage of width** (maintains aspect ratio), **Pixels**, or **Percentage of parent**

Default is 100% wide × 75% of width, giving a 4:3 landscape proportion.


### Advanced — Custom chart option

Every widget exposes a **Custom chart option** field. Enter a JSON object that is deep-merged into the ECharts option at render time. This gives access to a broad set of ECharts features — colors, fonts, toolbox, data zoom, mark lines, mark areas, visual map, brush selection, polar coordinates, and more — without touching code.

When **Custom chart option** contains a value, the datasource validation on series is relaxed — series entries without a datasource are allowed. This makes it possible to render a fully custom chart (e.g. a polar chart with all data embedded in the option) without configuring any Mendix datasource on the widget.

Example — add a data zoom slider to a line chart:

```json
{
  "dataZoom": [{ "type": "slider", "xAxisIndex": 0 }]
}
```


### Advanced — Custom init options

A JSON object passed directly to `echarts.init()`. Use this to change the renderer or set device pixel ratio:

```json
{ "renderer": "svg", "devicePixelRatio": 2 }
```


### Advanced — Theme name

The name of an ECharts color theme registered by the **ECharts Theme Loader** widget. When set, the chart reinitializes with that theme after the loader has registered it. All four chart widgets support this property.

Leave empty to use ECharts' built-in default theme. See **[docs/theming.md](docs/theming.md)** for a complete setup guide.

---


## ECharts Line chart

![ECharts Line chart](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsLineChart.png)


Renders one or more lines on a shared X/Y axis. Supports area fill, curved interpolation, data point markers, and an animated timeline slider.


### Series properties

Each entry in the **Series** list defines one line (or a group of lines in Multiple series mode).

| Property | Description |
| --- | --- |
| Data set | Single series or Multiple series (grouped) |
| Data source | Mendix data source providing the records |
| Group by | Attribute used to split records into separate lines (Multiple series only) |
| Series name | Text displayed in the legend |
| X axis attribute | Horizontal axis value — String, Enum, DateTime, or numeric |
| Y axis attribute | Vertical axis value — String, Enum, DateTime, or numeric |
| Aggregation function | How to combine records with the same X value |
| Tooltip hover text | Custom text shown in the tooltip on hover. Supports attribute tokens |
| Interpolation | **Linear** (straight segments) or **Curved** (smooth spline) |
| Line style | **Line**, **Line with markers**, or **Custom** (uses Custom series options) |
| Line color | CSS color expression evaluated per record, e.g. `'#3a7bd5'` |
| Marker color | CSS color for data point markers |
| Fill area | When enabled, fills the area below the line, turning it into an area chart |
| On click action | Mendix action triggered when the user clicks a data point |
| Timeline attribute | Groups records into timeline steps. Each unique value is one step |
| Custom series options | JSON merged into this series' ECharts series config (active when Line style = Custom) |


### Chart-level properties

| Property | Description |
| --- | --- |
| X axis label | Label displayed below the X axis |
| X axis date format | Format pattern for DateTime X values. Tokens: `yyyy`, `MM`, `dd`, `HH`, `mm`, `ss`. Example: `dd-MM-yyyy` |
| Y axis label | Label displayed to the left of the Y axis |
| Show legend / Legend position | Toggle and position the series legend |
| Grid lines | **None**, **Horizontal**, **Vertical**, or **Both** |
| Background color | CSS color for the chart canvas background. Leave empty for transparent |


### Timeline

When **Enable timeline** is on and at least one series has a **Timeline attribute** configured, ECharts renders a slider below the chart. Each distinct value of the timeline attribute becomes one step.

| Property | Description |
| --- | --- |
| Enable timeline | Activates the timeline slider |
| Timeline date format | Format for DateTime step labels |
| Auto play | Automatically advances through steps on load |
| Loop | Restarts from step 1 after the last step |
| Play interval (ms) | Time between automatic steps. Default: 2000 |
| Show rewind button | Adds a rewind button to the slider |

---


## ECharts Bar chart

![ECharts Bar chart](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsBarChart.png)


Renders one or more bar series on a shared category/value axis. Bars can be vertical or horizontal, grouped side-by-side, or stacked. Shares the same timeline feature as the Line chart.


### Bar series properties

| Property | Description |
| --- | --- |
| Data set | Single series or Multiple series (grouped) |
| Data source | Mendix data source |
| Group by | Attribute used to split records into separate bar series (Multiple series only) |
| Series name | Text shown in the legend |
| Category attribute | The axis used for categories (X for vertical bars, Y for horizontal bars). Accepts String, Enum, DateTime, or numeric |
| Value attribute | The numeric axis — Decimal, Integer, Long, or AutoNumber |
| Aggregation function | Aggregation applied when multiple records share the same category |
| Tooltip hover text | Custom tooltip text |
| Bar color | CSS color expression per record |
| On click action | Mendix action triggered on bar click |
| Timeline attribute | Groups records into timeline steps |
| Custom series options | JSON merged into the ECharts series config for this bar series |


### Bar series appearance — Color dimension

Each bar series has an optional **Color dimension attribute**. When set, the widget passes the attribute value as a third data dimension alongside the category and bar value. Combined with a `visualMap` in **Custom chart option**, this lets ECharts color each bar individually based on a separate numeric score — independent of the bar's height or length.

The color dimension data is exposed as the named dimension **`colorDim`** (index 2) in the ECharts dataset. Reference it in `visualMap` with `"dimension": "colorDim"` (or `"dimension": 2`).


#### Example — horizontal bars colored by score

Series setup:

| Setting | Value |
| --- | --- |
| Category attribute | Product name |
| Value attribute | Amount sold |
| Color dimension attribute | Score (0–100) |
| Bar color | *(leave empty)* |

Custom chart option — visualMap on the right:

```json
{
  "visualMap": {
    "show": true,
    "min": 0,
    "max": 100,
    "dimension": "colorDim",
    "orient": "vertical",
    "right": 10,
    "top": "center",
    "text": ["High score", "Low score"],
    "inRange": {
      "color": ["#50a3ba", "#eac736", "#d94e5d"]
    }
  },
  "grid": { "right": "15%" }
}
```

Custom chart option — visualMap at the bottom:

```json
{
  "visualMap": {
    "show": true,
    "min": 0,
    "max": 100,
    "dimension": "colorDim",
    "orient": "horizontal",
    "left": "center",
    "bottom": 0,
    "text": ["High score", "Low score"],
    "inRange": {
      "color": ["#50a3ba", "#eac736", "#d94e5d"]
    }
  },
  "grid": { "bottom": "15%" }
}
```

> The `grid` override reserves space so the visualMap does not overlap the bars. Adjust the percentage to match the number of text lines and gradient bar height. Set `"Bar color"` to empty when using visualMap — otherwise the series color overrides the visualMap coloring.


### Bar chart-level properties

| Property | Description |
| --- | --- |
| Horizontal bars | Rotates the chart so bars grow left-to-right |
| Stack series | Stacks all series on top of each other instead of placing them side by side |
| Bar width | Width of each bar: percentage (`60%`) or pixels (`20`). Leave empty for auto |
| Category axis label | Label for the category axis |
| Category date format | Format for DateTime category labels |
| Value axis label | Label for the value axis |
| Show legend / Legend position | Toggle and position the legend |
| Grid lines | None, Horizontal, Vertical, or Both |
| Background color | CSS background color |

The **Timeline** settings are identical to the Line chart.

---


## ECharts Pie / Donut chart

![ECharts Pie / Donut chart](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsPieChart.png)


Renders one or more concentric pie rings. Can be configured as a standard pie, a donut, or a Nightingale rose chart. Does not have X/Y axes; data is a list of slices with a label and a numeric value.


### Pie series properties

Each entry in the **Series** list defines one ring (concentric charts use multiple entries).

| Property | Description |
| --- | --- |
| Data set | **Single ring** — one data source, one ring. **Multiple rings** — records grouped by the Group by attribute, each group becoming a concentric ring |
| Data source | Mendix data source |
| Group by | Attribute used to create multiple rings from one query |
| Ring name | Name of the ring, shown in multi-ring legends |
| Slice label attribute | Attribute whose value is the slice name |
| Value attribute | Numeric attribute that determines the size of the slice |
| Aggregation function | How to combine records with the same slice label. Default: Sum |
| Tooltip hover text | Custom tooltip content |
| Slice color | CSS color expression per record |
| On click action | Mendix action triggered on slice click |
| Custom series options | JSON merged into this ring's ECharts series config |


### Pie chart-level properties

| Property | Description |
| --- | --- |
| Donut | Renders the chart with a hollow centre |
| Inner radius | Size of the donut hole, e.g. `40%`. Default: 40% |
| Outer radius | Outer size of the chart, e.g. `70%`. Default: 70% |
| Rose / Nightingale | Also varies the radius of each slice proportionally to its value, creating a Nightingale rose chart |
| Show legend / Legend position | Toggle and position the legend |
| Background color | CSS background color |

---


## ECharts Gauge chart

![ECharts Gauge chart](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsGaugeChart.png)


Renders a speedometer-style gauge. Supports two modes:

- **Context mode** — up to three fixed series read from a surrounding Data View. Best for a small, known set of attributes (e.g. a clock with Hour, Minute, Second).
- **List mode** — a list data source where every record becomes one needle in a single shared series. Best for a variable number of items stored as rows in a persistent entity (e.g. Good / Better / Perfect KPI indicators).


### Setup — context mode

1. Add a **Data View** to your page with the entity that holds the gauge values (e.g. a non-persistent entity with `Hour`, `Minute`, `Second` attributes).
2. Place the **ECharts Gauge Chart** widget inside the Data View.
3. In **Series 1**, set **Value attribute** to the primary attribute.
4. Optionally set **Series 2** and **Series 3** to additional attributes — this activates multi-series mode automatically.


### Setup — list mode (multi-needle)

1. Place the widget **directly on the page** — no surrounding Data View needed.
2. In the **Multi-needle (list)** property group, enable **Use list data source**.
3. Set **Data source** to a **Database** (XPath) data source on your persistent entity. Avoid microflow data sources — they cause repeated fetching with non-persistent entities.
4. Set **Value attribute** and **Label attribute** to the numeric and name attributes.
5. Paste the series styling in **Custom options (list series)**.

The widget automatically spaces title and detail labels evenly across the dial. For 3 items the positions are −40 %, 0 %, and 40 %; for any other count they are calculated proportionally.


### Multi-needle (list) properties

Visible only when **Use list data source** is enabled.

| Property | Description |
| --- | --- |
| Use list data source | Switches the widget to list mode. Hide Series 1/2/3 and show the list properties instead |
| Data source | Persistent entity data source (use Database / XPath — not a microflow returning NPEs) |
| Value attribute | Numeric attribute for the needle value |
| Label attribute | String or Enum attribute for the needle label |
| Custom options (list series) | JSON merged into the shared ECharts series config — pointer style, progress, anchor, detail formatter, etc. |


### Series configuration (context mode)

The widget has three series groups: **Series 1**, **Series 2**, and **Series 3**. Series 2 and 3 are optional; they activate when a value attribute is selected.

| Property | Description |
| --- | --- |
| Value attribute | Numeric context attribute for the needle — Decimal, Integer, Long, or AutoNumber |
| Label | Text template shown below the needle tip |
| Minimum *(Series 2 & 3)* | Minimum of the scale for this series. Default: 0 |
| Maximum *(Series 2 & 3)* | Maximum of the scale for this series. Default: 100 |
| Custom options *(per series)* | JSON object merged into this series' ECharts config — controls pointer style, axis visibility, detail label, etc. |

The **Minimum** and **Maximum** for Series 1 are taken from the General **Minimum** / **Maximum** properties.


### Scale properties

| Property | Description |
| --- | --- |
| Minimum | Minimum value on the gauge scale (applies to Series 1). Default: 0 |
| Maximum | Maximum value on the gauge scale (applies to Series 1). Default: 100 |
| Units | Suffix appended to the value in the centre label, e.g. `km/h` or `%` |
| Start angle | Start of the gauge arc in degrees, counter-clockwise from 3 o'clock. Default: 225 |
| End angle | End of the gauge arc in degrees, counter-clockwise from 3 o'clock. Default: -45 |
| Split number | Number of major tick intervals on the arc. Default: 10 |

The default start/end angles (225° / -45°) produce the classic speedometer arc with a gap at the bottom.


### Appearance properties

| Property | Description |
| --- | --- |
| Show progress bar | Fills the arc from the minimum to the current value, creating a coloured progress indicator |
| Color ranges | JSON array of `[threshold, color]` pairs. Each threshold is a **fraction** (0–1) of the full scale range. The last pair should always be `[1, "color"]` |
| Show legend / Legend position | Toggle and position the needle legend |
| Background color | CSS background color |


#### Color ranges explained

Color ranges define the background color of the gauge arc in bands. A threshold of `0.3` means "up to 30% of the way between minimum and maximum". Example:

```json
[[0.3, "#67e0e3"], [0.7, "#37a2da"], [1, "#fd666d"]]
```

This produces: teal for the lower 30%, blue for 30–70%, red for 70–100%.


### Formatter functions

The `axisLabel.formatter` and `detail.formatter` fields inside **Custom options** accept a JavaScript function written as a string. The widget converts it to a real function at render time.

Example — hide the `0` label on the clock face:

```json
"axisLabel": {
  "fontSize": 50,
  "distance": 25,
  "formatter": "function(value) { return value === 0 ? '' : value + ''; }"
}
```

Any valid single-argument ECharts formatter function body can be used here.


### Multi-series tips

In multi-series mode each series renders its own axis decorations (arc, ticks, labels). Usually you want these only on one series — keep them on Series 1 and hide them on the others via **Custom options**:

**Series 1 — hour hand, keep clock face visible:**

```json
{
  "clockwise": true,
  "animation": false,
  "axisLine": {
    "lineStyle": {
      "width": 15,
      "color": [[1, "rgba(0,0,0,0.7)"]],
      "shadowColor": "rgba(0,0,0,0.5)",
      "shadowBlur": 15
    }
  },
  "splitLine": {
    "lineStyle": {
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 3,
      "shadowOffsetX": 1,
      "shadowOffsetY": 2
    }
  },
  "axisLabel": {
    "fontSize": 50,
    "distance": 25,
    "formatter": "function(value) { return value === 0 ? '' : value + ''; }"
  },
  "pointer": {
    "icon": "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
    "width": 12,
    "length": "55%",
    "offsetCenter": [0, "8%"],
    "itemStyle": {
      "color": "#C0911F",
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 8,
      "shadowOffsetX": 2,
      "shadowOffsetY": 4
    }
  },
  "detail": { "show": false },
  "title": { "offsetCenter": [0, "30%"] }
}
```

**Series 2 — minute hand:**

```json
{
  "clockwise": true,
  "axisLine": { "show": false },
  "splitLine": { "show": false },
  "axisTick": { "show": false },
  "axisLabel": { "show": false },
  "pointer": {
    "icon": "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
    "width": 8,
    "length": "70%",
    "offsetCenter": [0, "8%"],
    "itemStyle": {
      "color": "#C0911F",
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 8,
      "shadowOffsetX": 2,
      "shadowOffsetY": 4
    }
  },
  "anchor": {
    "show": true,
    "size": 20,
    "showAbove": false,
    "itemStyle": {
      "borderWidth": 15,
      "borderColor": "#C0911F",
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 8,
      "shadowOffsetX": 2,
      "shadowOffsetY": 4
    }
  },
  "detail": { "show": false },
  "title": { "offsetCenter": ["0%", "-40%"] }
}
```

**Series 3 — second hand (no sweep animation on reset):**

```json
{
  "clockwise": true,
  "animation": false,
  "animationEasingUpdate": "bounceOut",
  "axisLine": { "show": false },
  "splitLine": { "show": false },
  "axisTick": { "show": false },
  "axisLabel": { "show": false },
  "pointer": {
    "icon": "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
    "width": 4,
    "length": "85%",
    "offsetCenter": [0, "8%"],
    "itemStyle": {
      "color": "#C0911F",
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 8,
      "shadowOffsetX": 2,
      "shadowOffsetY": 4
    }
  },
  "anchor": {
    "show": true,
    "size": 15,
    "showAbove": true,
    "itemStyle": {
      "color": "#C0911F",
      "shadowColor": "rgba(0,0,0,0.3)",
      "shadowBlur": 8,
      "shadowOffsetX": 2,
      "shadowOffsetY": 4
    }
  },
  "detail": { "show": false },
  "title": { "offsetCenter": ["0%", "-40%"] }
}
```


### Multi-needle list mode example

Based on the [Apache ECharts multi-title gauge example](https://echarts.apache.org/examples/en/editor.html?c=gauge-multi-title).

**Custom options (list series):**

```json
{
  "animation": false,
  "anchor": {
    "show": true,
    "showAbove": true,
    "size": 18,
    "itemStyle": { "color": "#FAC858" }
  },
  "pointer": {
    "icon": "path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z",
    "width": 8,
    "length": "80%",
    "offsetCenter": [0, "8%"]
  },
  "progress": {
    "show": true,
    "overlap": true,
    "roundCap": true
  },
  "axisLine": { "roundCap": true },
  "title": { "fontSize": 14 },
  "detail": {
    "width": 40,
    "height": 14,
    "fontSize": 14,
    "color": "#fff",
    "backgroundColor": "inherit",
    "borderRadius": 3,
    "formatter": "{value}%"
  }
}
```

> **Note:** Set `"animation": false` to prevent ghost needle trails when values update frequently. The label positions (`-40%`, `0%`, `40%` for 3 items) are calculated automatically — no manual offset configuration is needed.


### Clock gauge example

A clock gauge maps `Hour` (0–12), `Minute` (0–60), and `Second` (0–60) attributes from a Data View onto three series:

| Setting | Value |
| --- | --- |
| Start angle | `90` |
| End angle | `-270` |
| Series 1 Min / Max | `0` / `12` |
| Series 2 Min / Max | `0` / `60` |
| Series 3 Min / Max | `0` / `60` |

Use the **Custom options** blocks above for each series. The result matches the [Apache ECharts clock gauge example](https://echarts.apache.org/examples/en/editor.html?c=gauge-clock).

---


## Polar line chart

The Line chart widget supports polar coordinate charts by combining a Mendix datasource with Custom series options and Custom chart option.


### Example — Two Value-Axes in Polar

Based on the [Apache ECharts polar line example](https://echarts.apache.org/examples/en/editor.html?c=line-polar2).

**Setup:**

1. Create a persistent entity (e.g. `TwoValueAxesInPolar`) with attributes:
   - `r` — Decimal (radius value, computed as `sin(2t) * cos(2t)`)
   - `i` — Integer (angle, 0–360)
2. Populate 361 records, one per degree.
3. Add an **ECharts Line Chart** widget to your page (no surrounding Data View needed).
4. Add one series entry, configured as follows:

**General tab:**

| Setting | Value |
| --- | --- |
| Data source | Database datasource on your entity, **sorted by `i` ascending** |
| Series name | `line` |
| X axis attribute | `r` (radius) |
| Y axis attribute | `i` (angle) |

**Appearance tab:**

| Setting | Value |
| --- | --- |
| Line style | **Custom** |

**Advanced tab (series):**

```json
{"coordinateSystem":"polar","showSymbol":false}
```

**Advanced tab (widget) — Custom chart option:**

```json
{"title":{"text":"Two Value-Axes in Polar","left":"center"},"polar":{"center":["50%","54%"]},"angleAxis":{"type":"value","startAngle":0},"radiusAxis":{"min":0},"xAxis":{"show":false},"yAxis":{"show":false},"grid":{"show":false}}
```

> **Important:** The datasource must be sorted by `i` (angle) ascending. ECharts connects data points in the order they arrive — wrong order produces a zig-zag line instead of smooth petals.
> **Decimal precision:** The widget passes Decimal X-axis values at full precision. For polar charts this ensures smooth curves — no rounding artefacts.

---


## Tips and tricks

**Per-record colors** — The color expression fields on line, bar, and pie charts are evaluated for every record. You can return different colors based on attribute values:

```text
if $currentObject/Status = 'Critical' then '#e74c3c' else '#2ecc71'
```

**Custom series options for advanced styling** — Set Line style to **Custom** on a line chart series to unlock the full ECharts series API via the Custom series options JSON field. For example, to add a dashed line:

```json
{ "lineStyle": { "type": "dashed", "width": 2 }, "symbol": "none" }
```

**Multiple needles, one dial** — Use Series 2 and/or Series 3 (context mode) for a fixed set of needles with independent scales, or enable **Use list data source** (list mode) for a dynamic number of needles from a persistent entity.

**Responsive sizing** — Use **Percentage of width** height with a value of `56` to get a 16:9 chart that scales with the page column width.

---


## ECharts Theme Loader

![ECharts Theme Loader / Theme Loader](https://github.com/LuchKlooster/MendixConventECharts/blob/main/docs/images/EChartsThemeLoader.png)


The **ECharts Theme Loader** is a non-visual helper widget. It takes a theme name and a JSON theme definition, registers the theme at runtime, and notifies all chart widgets on the same page to reinitialize with it.

Place it once on a shared layout so every page automatically receives the theme. Chart widgets pick up the theme by setting their **Theme name** property to the same value.

| Property | Description |
| --- | --- |
| Theme name | Identifier for the theme. Must match the **Theme name** set on the chart widgets |
| Theme JSON | ECharts theme object as a JSON string — either hand-crafted or generated by the Atlas extractor tool |

For a step-by-step guide, including how to generate a theme from your Atlas UI SCSS variables, see **[docs/theming.md](docs/theming.md)**.

---


## License

Apache-2.0 — © Convent Systems
