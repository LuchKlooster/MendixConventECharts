/**
 * ECharts ships the built-in theme objects under `echarts/lib/theme/*` but only
 * exposes their `.d.ts` files under `echarts/types/src/theme/*`, so a direct
 * import doesn't resolve types. We only read colour strings off the object, so a
 * loose shape is enough.
 */
declare module "echarts/lib/theme/dark.js" {
    const theme: Record<string, unknown>;
    export default theme;
}
