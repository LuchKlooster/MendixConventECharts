export function formatTimestamp(timestamp: number, fmt: string): string {
    const d = new Date(timestamp);
    const locale = typeof navigator !== "undefined" ? navigator.language : undefined;

    const weekNumber = (() => {
        const jan4 = new Date(d.getFullYear(), 0, 4);
        const startOfWeek1 = new Date(jan4);
        startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
        return Math.floor((d.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
    })();

    const tokens: Record<string, string> = {
        EEEE: d.toLocaleDateString(locale, { weekday: "long" }),
        EEE:  d.toLocaleDateString(locale, { weekday: "short" }),
        E:    d.toLocaleDateString(locale, { weekday: "short" }),
        MMMM: d.toLocaleDateString(locale, { month: "long" }),
        MMM:  d.toLocaleDateString(locale, { month: "short" }),
        yyyy: String(d.getFullYear()),
        yy:   String(d.getFullYear()).slice(-2),
        MM:   String(d.getMonth() + 1).padStart(2, "0"),
        dd:   String(d.getDate()).padStart(2, "0"),
        d:    String(d.getDate()),
        HH:   String(d.getHours()).padStart(2, "0"),
        H:    String(d.getHours()),
        mm:   String(d.getMinutes()).padStart(2, "0"),
        ss:   String(d.getSeconds()).padStart(2, "0"),
        ww:   String(weekNumber).padStart(2, "0"),
        Q:    String(Math.floor(d.getMonth() / 3) + 1)
    };

    // Single-pass replacement — longest tokens appear first in the alternation
    // so substituted values are never re-processed by a subsequent token rule.
    return fmt.replace(/EEEE|EEE|E|MMMM|MMM|yyyy|yy|MM|dd|d|HH|H|mm|ss|ww|Q/g,
        token => tokens[token] ?? token);
}
