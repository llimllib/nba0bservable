export function sliceQuantile(arr: any[], field: string, percentage: number) {
  return arr
    .sort((a, b) => a[field] - b[field])
    .slice(Math.ceil(arr.length * percentage));
}
