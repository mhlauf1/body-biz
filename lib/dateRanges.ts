import { format, startOfQuarter, startOfYear, subDays } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// Business timezone for The Body Biz (Columbus, OH)
const BUSINESS_TIMEZONE = 'America/New_York'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

export interface DateRangePreset {
  value: string
  label: string
  getRange: () => DateRange
}

/**
 * Get the current date/time in the business timezone
 * This ensures consistent date calculations regardless of server timezone
 */
function getBusinessDate(date: Date = new Date()): Date {
  return toZonedTime(date, BUSINESS_TIMEZONE)
}

/**
 * Get the current pay period boundaries
 * Semi-monthly pay periods:
 * - Period 1: 1st - 15th of month
 * - Period 2: 16th - last day of month
 *
 * All calculations use Columbus, OH timezone for consistency
 */
export function getCurrentPayPeriod(date: Date = new Date()): DateRange {
  const bizDate = getBusinessDate(date)
  const day = bizDate.getDate()
  const year = bizDate.getFullYear()
  const month = bizDate.getMonth()

  if (day <= 15) {
    // First half: 1st - 15th
    return {
      start: new Date(year, month, 1, 0, 0, 0, 0),
      end: new Date(year, month, 15, 23, 59, 59, 999),
      label: `${formatMonth(month)} 1-15, ${year}`,
    }
  } else {
    // Second half: 16th - end of month
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      start: new Date(year, month, 16, 0, 0, 0, 0),
      end: new Date(year, month, lastDay, 23, 59, 59, 999),
      label: `${formatMonth(month)} 16-${lastDay}, ${year}`,
    }
  }
}

/**
 * Get the previous pay period boundaries
 * All calculations use Columbus, OH timezone for consistency
 */
export function getPreviousPayPeriod(date: Date = new Date()): DateRange {
  const bizDate = getBusinessDate(date)
  const day = bizDate.getDate()
  const year = bizDate.getFullYear()
  const month = bizDate.getMonth()

  if (day <= 15) {
    // Currently in first half, previous is second half of last month
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const lastDayPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    return {
      start: new Date(prevYear, prevMonth, 16, 0, 0, 0, 0),
      end: new Date(prevYear, prevMonth, lastDayPrevMonth, 23, 59, 59, 999),
      label: `${formatMonth(prevMonth)} 16-${lastDayPrevMonth}, ${prevYear}`,
    }
  } else {
    // Currently in second half, previous is first half of same month
    return {
      start: new Date(year, month, 1, 0, 0, 0, 0),
      end: new Date(year, month, 15, 23, 59, 59, 999),
      label: `${formatMonth(month)} 1-15, ${year}`,
    }
  }
}

/**
 * Get this month's date range
 * All calculations use Columbus, OH timezone for consistency
 */
export function getThisMonth(date: Date = new Date()): DateRange {
  const bizDate = getBusinessDate(date)
  const year = bizDate.getFullYear()
  const month = bizDate.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month, lastDay, 23, 59, 59, 999),
    label: `${formatMonth(month)} ${year}`,
  }
}

/**
 * Get last 4 weeks date range
 */
export function getLast4Weeks(date: Date = new Date()): DateRange {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  const start = subDays(date, 28)
  start.setHours(0, 0, 0, 0)

  return {
    start,
    end,
    label: `Last 4 weeks`,
  }
}

/**
 * Get this quarter's date range
 */
export function getThisQuarter(date: Date = new Date()): DateRange {
  const quarterStart = startOfQuarter(date)
  const quarterNum = Math.floor(date.getMonth() / 3) + 1
  const year = date.getFullYear()

  // Get end of quarter
  const quarterEndMonth = quarterNum * 3 - 1
  const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate()
  const quarterEnd = new Date(year, quarterEndMonth, lastDay, 23, 59, 59, 999)

  return {
    start: quarterStart,
    end: quarterEnd,
    label: `Q${quarterNum} ${year}`,
  }
}

/**
 * Get this year's date range (from Jan 1 to today)
 */
export function getThisYear(date: Date = new Date()): DateRange {
  const yearStart = startOfYear(date)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return {
    start: yearStart,
    end,
    label: `${date.getFullYear()} YTD`,
  }
}

/**
 * Get all date range presets
 */
export function getDateRangePresets(): DateRangePreset[] {
  return [
    {
      value: 'current_pay_period',
      label: 'Current Pay Period',
      getRange: () => getCurrentPayPeriod(),
    },
    {
      value: 'previous_pay_period',
      label: 'Previous Pay Period',
      getRange: () => getPreviousPayPeriod(),
    },
    {
      value: 'this_month',
      label: 'This Month',
      getRange: () => getThisMonth(),
    },
    {
      value: 'last_4_weeks',
      label: 'Last 4 Weeks',
      getRange: () => getLast4Weeks(),
    },
    {
      value: 'this_quarter',
      label: 'This Quarter',
      getRange: () => getThisQuarter(),
    },
    {
      value: 'this_year',
      label: 'This Year',
      getRange: () => getThisYear(),
    },
    {
      value: 'custom',
      label: 'Custom Range',
      getRange: () => getCurrentPayPeriod(), // Default for custom
    },
  ]
}

/**
 * Format a period label from start and end dates
 */
export function formatPeriodLabel(start: Date, end: Date): string {
  const startMonth = start.getMonth()
  const endMonth = end.getMonth()
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startMonth === endMonth && startYear === endYear) {
    // Same month
    return `${formatMonth(startMonth)} ${start.getDate()}-${end.getDate()}, ${startYear}`
  } else if (startYear === endYear) {
    // Same year, different months
    return `${formatMonth(startMonth)} ${start.getDate()} - ${formatMonth(endMonth)} ${end.getDate()}, ${startYear}`
  } else {
    // Different years
    return `${formatMonth(startMonth)} ${start.getDate()}, ${startYear} - ${formatMonth(endMonth)} ${end.getDate()}, ${endYear}`
  }
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Format month name (short)
 */
function formatMonth(month: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return months[month]
}
