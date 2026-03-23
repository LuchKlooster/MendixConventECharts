/**
 * Custom Rollup config that extends the default pluggable-widgets-tools build
 * to also compile EChartsBarChart as a second widget in the same package.
 *
 * The tools pass `args.configDefaultConfig` with the pre-built configs for
 * EChartsLineChart.  We strip the `force-close` shim from those configs,
 * add equivalent configs for EChartsBarChart, and place `force-close` only
 * on the very last bundle so rollup exits cleanly after all widgets are built.
 */

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, copyFileSync } from "node:fs";
import alias from "@rollup/plugin-alias";
import { getBabelInputPlugin, getBabelOutputPlugin } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import image from "@rollup/plugin-image";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "rollup-plugin-re";
import typescript from "@rollup/plugin-typescript";
import postcssImport from "postcss-import";
import postcssUrl from "postcss-url";
import command from "rollup-plugin-command";
import postcss from "rollup-plugin-postcss";
import terser from "@rollup/plugin-terser";
import { createMpkFile } from "@mendix/pluggable-widgets-tools/configs/helpers/rollup-helper.mjs";
import { widgetPackage, widgetVersion } from "@mendix/pluggable-widgets-tools/configs/shared.mjs";

const sourcePath = process.cwd();
const outDir = join(sourcePath, "dist/tmp/widgets/");
const mpkDir = join(sourcePath, "dist", widgetVersion);
const mpkFile = join(mpkDir, `${widgetPackage}.ConventECharts.mpk`);

const hotEntry = fileURLToPath(
    new URL("./node_modules/@mendix/pluggable-widgets-tools/configs/hot.js", import.meta.url)
);

const extensions = [".js", ".jsx", ".tsx", ".ts"];
const commonExternalLibs = [/^mendix($|\/)/, /^react$/, /^react\/jsx-runtime$/, /^react-dom$/];
const webExternal = [...commonExternalLibs, /^big.js$/];

/**
 * Strip force-close and the built-in createMpkFile command from a config's
 * plugin list.  Our own configs create the correctly-named MPK; we don't want
 * the default line-chart config to also produce a stale EChartsLineChart.mpk.
 */
function removeForceClose(config) {
    return {
        ...config,
        plugins: (config.plugins || []).filter(p => p && p.name !== "force-close" && p.name !== "command")
    };
}

export default async args => {
    const defaultConfigs = (args.configDefaultConfig || []).map(removeForceClose);
    const production = Boolean(args.configProduction);

    // ── Bar chart output paths ────────────────────────────────────────────────
    const outBarDir = "conventsystems/echartsbarchart";
    const outBarFile = join(outBarDir, "EChartsBarChart");

    // ── Shared plugin factory ─────────────────────────────────────────────────
    function getCommonPlugins({ sourceMaps, transpile, babelConfig, external }) {
        return [
            nodeResolve({ preferBuiltins: false, mainFields: ["module", "browser", "main"] }),
            typescript({
                noEmitOnError: !args.watch,
                sourceMap: sourceMaps,
                inlineSources: sourceMaps,
                target: "es2022",
                exclude: ["**/__tests__/**/*"]
            }),
            getBabelInputPlugin({
                sourceMaps,
                babelrc: false,
                babelHelpers: "bundled",
                overrides: [
                    {
                        test: /node_modules/,
                        plugins: [
                            "@babel/plugin-transform-flow-strip-types",
                            "@babel/plugin-transform-react-jsx"
                        ]
                    },
                    {
                        exclude: /node_modules/,
                        plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]]
                    }
                ]
            }),
            commonjs({
                extensions,
                transformMixedEsModules: true,
                requireReturnsDefault: "auto",
                ignore: id => (external || []).some(value => new RegExp(value).test(id))
            }),
            replace({
                patterns: [
                    {
                        test: "process.env.NODE_ENV",
                        replace: production ? "'production'" : "'development'"
                    }
                ]
            }),
            transpile
                ? getBabelOutputPlugin({
                      sourceMaps,
                      babelrc: false,
                      compact: false,
                      ...(babelConfig || {})
                  })
                : null,
            image(),
            production ? terser() : null
        ].filter(Boolean);
    }

    const barChartConfigs = [];

    // ── Widget bundles (AMD + ES) ─────────────────────────────────────────────
    ["amd", "es"].forEach(outputFormat => {
        barChartConfigs.push({
            input: join(sourcePath, "src/EChartsBarChart.tsx"),
            output: {
                format: outputFormat,
                file: join(outDir, `${outBarFile}.${outputFormat === "es" ? "mjs" : "js"}`),
                sourcemap: !production ? "inline" : false
            },
            external: webExternal,
            plugins: [
                postcss({
                    extensions: [".css", ".sass", ".scss"],
                    extract: outputFormat === "amd",
                    inject: false,
                    minimize: production,
                    plugins: [postcssImport(), postcssUrl({ url: "copy", assetsPath: "assets" })],
                    sourceMap: !production ? "inline" : false,
                    use: ["sass"],
                    to: join(outDir, `${outBarFile}.css`)
                }),
                alias({ entries: { "react-hot-loader/root": hotEntry } }),
                ...getCommonPlugins({
                    sourceMaps: !production,
                    transpile: production,
                    babelConfig: {
                        presets: [["@babel/preset-env", { targets: { safari: "12" } }]],
                        allowAllFormats: true
                    },
                    external: outputFormat === "es" ? [] : webExternal
                }),
                // Create MPK after every bundle (last one wins)
                command([
                    async () =>
                        createMpkFile({
                            mpkDir,
                            mpkFile,
                            widgetTmpDir: outDir,
                            isProduction: production,
                            mxProjectPath: undefined,
                            deploymentPath: "deployment/web/widgets"
                        })
                ])
            ]
        });
    });

    // ── Editor preview ────────────────────────────────────────────────────────
    barChartConfigs.push({
        input: join(sourcePath, "src/EChartsBarChart.editorPreview.tsx"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsBarChart.editorPreview.js"),
            sourcemap: !production ? "inline" : false
        },
        external: commonExternalLibs,
        plugins: [
            postcss({
                extensions: [".css", ".sass", ".scss"],
                extract: false,
                inject: true,
                minimize: production,
                plugins: [postcssImport(), postcssUrl({ url: "inline" })],
                sourceMap: !production ? "inline" : false,
                use: ["sass"]
            }),
            ...getCommonPlugins({
                sourceMaps: !production,
                transpile: production,
                babelConfig: { presets: [["@babel/preset-env", { targets: { safari: "12" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ])
        ]
    });

    // ── Bar chart editor config ───────────────────────────────────────────────
    barChartConfigs.push({
        input: join(sourcePath, "src/EChartsBarChart.editorConfig.ts"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsBarChart.editorConfig.js"),
            sourcemap: false
        },
        external: commonExternalLibs,
        strictDeprecations: true,
        treeshake: { moduleSideEffects: false },
        plugins: [
            ...getCommonPlugins({
                sourceMaps: false,
                transpile: true,
                babelConfig: { presets: [["@babel/preset-env", { targets: { ie: "11" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ])
        ]
    });

    // ── Pie chart output paths ────────────────────────────────────────────────
    const outPieDir = "conventsystems/echartspiechart";
    const outPieFile = join(outPieDir, "EChartsPieChart");

    const pieChartConfigs = [];

    // ── Pie chart widget bundles (AMD + ES) ───────────────────────────────────
    ["amd", "es"].forEach(outputFormat => {
        pieChartConfigs.push({
            input: join(sourcePath, "src/EChartsPieChart.tsx"),
            output: {
                format: outputFormat,
                file: join(outDir, `${outPieFile}.${outputFormat === "es" ? "mjs" : "js"}`),
                sourcemap: !production ? "inline" : false
            },
            external: webExternal,
            plugins: [
                postcss({
                    extensions: [".css", ".sass", ".scss"],
                    extract: outputFormat === "amd",
                    inject: false,
                    minimize: production,
                    plugins: [postcssImport(), postcssUrl({ url: "copy", assetsPath: "assets" })],
                    sourceMap: !production ? "inline" : false,
                    use: ["sass"],
                    to: join(outDir, `${outPieFile}.css`)
                }),
                alias({ entries: { "react-hot-loader/root": hotEntry } }),
                ...getCommonPlugins({
                    sourceMaps: !production,
                    transpile: production,
                    babelConfig: {
                        presets: [["@babel/preset-env", { targets: { safari: "12" } }]],
                        allowAllFormats: true
                    },
                    external: outputFormat === "es" ? [] : webExternal
                }),
                command([
                    async () =>
                        createMpkFile({
                            mpkDir,
                            mpkFile,
                            widgetTmpDir: outDir,
                            isProduction: production,
                            mxProjectPath: undefined,
                            deploymentPath: "deployment/web/widgets"
                        })
                ])
            ]
        });
    });

    // ── Pie chart editor preview ──────────────────────────────────────────────
    pieChartConfigs.push({
        input: join(sourcePath, "src/EChartsPieChart.editorPreview.tsx"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsPieChart.editorPreview.js"),
            sourcemap: !production ? "inline" : false
        },
        external: commonExternalLibs,
        plugins: [
            postcss({
                extensions: [".css", ".sass", ".scss"],
                extract: false,
                inject: true,
                minimize: production,
                plugins: [postcssImport(), postcssUrl({ url: "inline" })],
                sourceMap: !production ? "inline" : false,
                use: ["sass"]
            }),
            ...getCommonPlugins({
                sourceMaps: !production,
                transpile: production,
                babelConfig: { presets: [["@babel/preset-env", { targets: { safari: "12" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ])
        ]
    });

    // ── Pie chart editor config ───────────────────────────────────────────────
    pieChartConfigs.push({
        input: join(sourcePath, "src/EChartsPieChart.editorConfig.ts"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsPieChart.editorConfig.js"),
            sourcemap: false
        },
        external: commonExternalLibs,
        strictDeprecations: true,
        treeshake: { moduleSideEffects: false },
        plugins: [
            ...getCommonPlugins({
                sourceMaps: false,
                transpile: true,
                babelConfig: { presets: [["@babel/preset-env", { targets: { ie: "11" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ])
        ]
    });

    // ── Gauge chart output paths ──────────────────────────────────────────────
    const outGaugeDir = "conventsystems/echartsgaugechart";
    const outGaugeFile = join(outGaugeDir, "EChartsGaugeChart");

    const gaugeChartConfigs = [];

    // ── Gauge chart widget bundles (AMD + ES) ─────────────────────────────────
    ["amd", "es"].forEach(outputFormat => {
        gaugeChartConfigs.push({
            input: join(sourcePath, "src/EChartsGaugeChart.tsx"),
            output: {
                format: outputFormat,
                file: join(outDir, `${outGaugeFile}.${outputFormat === "es" ? "mjs" : "js"}`),
                sourcemap: !production ? "inline" : false
            },
            external: webExternal,
            plugins: [
                postcss({
                    extensions: [".css", ".sass", ".scss"],
                    extract: outputFormat === "amd",
                    inject: false,
                    minimize: production,
                    plugins: [postcssImport(), postcssUrl({ url: "copy", assetsPath: "assets" })],
                    sourceMap: !production ? "inline" : false,
                    use: ["sass"],
                    to: join(outDir, `${outGaugeFile}.css`)
                }),
                alias({ entries: { "react-hot-loader/root": hotEntry } }),
                ...getCommonPlugins({
                    sourceMaps: !production,
                    transpile: production,
                    babelConfig: {
                        presets: [["@babel/preset-env", { targets: { safari: "12" } }]],
                        allowAllFormats: true
                    },
                    external: outputFormat === "es" ? [] : webExternal
                }),
                command([
                    async () =>
                        createMpkFile({
                            mpkDir,
                            mpkFile,
                            widgetTmpDir: outDir,
                            isProduction: production,
                            mxProjectPath: undefined,
                            deploymentPath: "deployment/web/widgets"
                        })
                ])
            ]
        });
    });

    // ── Gauge chart editor preview ────────────────────────────────────────────
    gaugeChartConfigs.push({
        input: join(sourcePath, "src/EChartsGaugeChart.editorPreview.tsx"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsGaugeChart.editorPreview.js"),
            sourcemap: !production ? "inline" : false
        },
        external: commonExternalLibs,
        plugins: [
            postcss({
                extensions: [".css", ".sass", ".scss"],
                extract: false,
                inject: true,
                minimize: production,
                plugins: [postcssImport(), postcssUrl({ url: "inline" })],
                sourceMap: !production ? "inline" : false,
                use: ["sass"]
            }),
            ...getCommonPlugins({
                sourceMaps: !production,
                transpile: production,
                babelConfig: { presets: [["@babel/preset-env", { targets: { safari: "12" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ])
        ]
    });

    // ── Gauge chart editor config (last bundle – also exits the process) ──────
    gaugeChartConfigs.push({
        input: join(sourcePath, "src/EChartsGaugeChart.editorConfig.ts"),
        output: {
            format: "commonjs",
            file: join(outDir, "EChartsGaugeChart.editorConfig.js"),
            sourcemap: false
        },
        external: commonExternalLibs,
        strictDeprecations: true,
        treeshake: { moduleSideEffects: false },
        plugins: [
            ...getCommonPlugins({
                sourceMaps: false,
                transpile: true,
                babelConfig: { presets: [["@babel/preset-env", { targets: { ie: "11" } }]] },
                external: commonExternalLibs
            }),
            command([
                async () => {
                    // Copy widget XMLs and package.xml into the output directory
                    const xmlFiles = [
                        "package.xml",
                        "EChartsLineChart.xml",
                        "EChartsBarChart.xml",
                        "EChartsPieChart.xml",
                        "EChartsGaugeChart.xml"
                    ];
                    for (const f of xmlFiles) {
                        const src = join(sourcePath, "src", f);
                        if (existsSync(src)) copyFileSync(src, join(outDir, f));
                    }
                    // Copy icon / tile PNGs for all four widgets
                    const widgetNames = ["EChartsLineChart", "EChartsBarChart", "EChartsPieChart", "EChartsGaugeChart"];
                    const pngSuffixes = ["icon.png", "icon.dark.png", "tile.png", "tile.dark.png"];
                    for (const name of widgetNames) {
                        for (const suffix of pngSuffixes) {
                            const src = join(sourcePath, `src/${name}.${suffix}`);
                            if (existsSync(src)) copyFileSync(src, join(outDir, `${name}.${suffix}`));
                        }
                    }
                },
                async () =>
                    createMpkFile({
                        mpkDir,
                        mpkFile,
                        widgetTmpDir: outDir,
                        isProduction: production,
                        mxProjectPath: undefined,
                        deploymentPath: "deployment/web/widgets"
                    })
            ]),
            {
                name: "force-close",
                closeBundle() {
                    if (!process.env.ROLLUP_WATCH) {
                        setTimeout(() => process.exit(0));
                    }
                }
            }
        ]
    });

    return [...defaultConfigs, ...barChartConfigs, ...pieChartConfigs, ...gaugeChartConfigs];
};
