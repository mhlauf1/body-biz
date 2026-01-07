'use client'

import { useState, useEffect } from 'react'
import { Select, Input } from '@/components/ui'
import { getDateRangePresets, toISODateString, formatPeriodLabel } from '@/lib/dateRanges'
import type { DateRange } from '@/lib/dateRanges'
import { Calendar } from 'lucide-react'

interface DateRangeSelectorProps {
  defaultRange: DateRange
  onRangeChange: (start: Date, end: Date) => void
}

export function DateRangeSelector({
  defaultRange,
  onRangeChange,
}: DateRangeSelectorProps) {
  const presets = getDateRangePresets()
  const [selectedPreset, setSelectedPreset] = useState('current_pay_period')
  const [customStart, setCustomStart] = useState(toISODateString(defaultRange.start))
  const [customEnd, setCustomEnd] = useState(toISODateString(defaultRange.end))
  const [periodLabel, setPeriodLabel] = useState(defaultRange.label)

  const presetOptions = presets.map((p) => ({
    value: p.value,
    label: p.label,
  }))

  useEffect(() => {
    if (selectedPreset === 'custom') {
      // For custom, use the user-entered dates
      const start = new Date(customStart)
      const end = new Date(customEnd)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        setPeriodLabel(formatPeriodLabel(start, end))
        onRangeChange(start, end)
      }
    } else {
      // For presets, get the range from the preset function
      const preset = presets.find((p) => p.value === selectedPreset)
      if (preset) {
        const range = preset.getRange()
        setPeriodLabel(range.label)
        setCustomStart(toISODateString(range.start))
        setCustomEnd(toISODateString(range.end))
        onRangeChange(range.start, range.end)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset])

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPreset(e.target.value)
  }

  const handleCustomDateChange = () => {
    if (selectedPreset === 'custom') {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        setPeriodLabel(formatPeriodLabel(start, end))
        onRangeChange(start, end)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <Select
            label="Period"
            id="date-preset"
            options={presetOptions}
            value={selectedPreset}
            onChange={handlePresetChange}
          />
        </div>

        {selectedPreset === 'custom' && (
          <>
            <div className="min-w-[160px]">
              <Input
                label="Start Date"
                id="start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                onBlur={handleCustomDateChange}
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                label="End Date"
                id="end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                onBlur={handleCustomDateChange}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span>Showing data for: <strong>{periodLabel}</strong></span>
      </div>
    </div>
  )
}
