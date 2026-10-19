import { resolvePreset, sanitizeRange, type DateRange, type RangePreset, RANGE_PRESETS } from "@/lib/finance/dates";

const PRESET_VALUES = new Set(RANGE_PRESETS.map((p) => p.value));

/** Parse ?preset&start&end search params into a validated range (server side). */
export function rangeFromSearchParams(
  params: Record<string, string | string[] | undefined>,
  today: string,
  defaultPreset: RangePreset = "this_month"
): { preset: RangePreset; range: DateRange } {
  const presetRaw = typeof params.preset === "string" ? params.preset : defaultPreset;
  const preset = (PRESET_VALUES.has(presetRaw as RangePreset) ? presetRaw : defaultPreset) as RangePreset;
  if (preset === "custom") {
    const custom = sanitizeRange(params.start, params.end, today);
    if (custom) return { preset, range: custom };
    return { preset: defaultPreset, range: resolvePreset(defaultPreset, today) };
  }
  return { preset, range: resolvePreset(preset, today) };
}
