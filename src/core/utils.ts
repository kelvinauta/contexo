
export function formatNumber(num: number | string): string {
    const n = typeof num === "number" ? num.toString() : num;
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
}
