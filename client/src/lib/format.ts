/**
 * Format a number to Indian Rupee (INR) currency string with proper numbering format.
 * E.g. 125000 -> "₹1,25,000"
 */
export function formatINR(amount: number, showDecimals = false): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  })
  return formatter.format(amount)
}

/**
 * Format a date range string without en-dash per anti-slop rules. E.g. "12 Nov to 14 Nov"
 */
export function formatDateRange(from?: Date, to?: Date): string {
  if (!from) return 'Select event dates'
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const fromStr = from.toLocaleDateString('en-IN', options)
  
  if (!to) return fromStr
  
  const toStr = to.toLocaleDateString('en-IN', options)
  return `${fromStr} to ${toStr}`
}
