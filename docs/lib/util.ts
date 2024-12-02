export function sliceQuantile(arr: any[], field: string, percentage: number) {
  if (!Object.hasOwn(arr[0], field)) {
    throw new Error(`undefined field ${field}: ${arr[0]}`)
  }
  return arr
    .sort((a, b) => a[field] - b[field])
    .slice(Math.ceil(arr.length * percentage))
}
