export function formatTimestamp(timestamp: number, fmt: string): string {
    const d = new Date(timestamp);
    return fmt
        .replace(/yyyy/g, String(d.getFullYear()))
        .replace(/yy/g, String(d.getFullYear()).slice(-2))
        .replace(/MM/g, String(d.getMonth() + 1).padStart(2, "0"))
        .replace(/dd/g, String(d.getDate()).padStart(2, "0"))
        .replace(/HH/g, String(d.getHours()).padStart(2, "0"))
        .replace(/mm/g, String(d.getMinutes()).padStart(2, "0"))
        .replace(/ss/g, String(d.getSeconds()).padStart(2, "0"));
}
