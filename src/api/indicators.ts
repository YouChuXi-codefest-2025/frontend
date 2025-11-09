export interface HeatForecastItem {
  heat_injury_index: number
  heat_injury_warning: string
  issue_time: string // e.g. '2025-11-09 00:00:00'
}

export interface HeatForecastResponse {
  city: string
  district: string
  forecasts: HeatForecastItem[]
}

const INDICATORS_BASE_URL = import.meta.env.VITE_BACKEND_URL || ''

// 溫差提醒（TempDiff）
export interface TempDiffForecastItem {
  issue_time: string
  // 其餘欄位依後端而定，至少會有一個代表指數的數值欄位
  // 常見可能名稱：temp_diff_index / temperature_difference_index / index / value ...
  [key: string]: unknown
}

export interface TempDiffForecastResponse {
  city: string
  district: string
  forecasts: TempDiffForecastItem[]
}

// AQI / PM2.5 即時資料
export interface AqiPm25Response {
  aqi_category?: string
  aqi_pm25?: number
  pm25_ugm3?: number
  bucket?: { lat_bucket?: number; lon_bucket?: number }
  cams_reference_time?: string
  grid_point?: { lat?: number; lon?: number }
  input?: { lat?: number; lon?: number }
  note?: string
  slot_ts_taipei?: string
  slot_ts_utc?: string
  source?: string
  [key: string]: unknown
}

/**
 * 取得溫差提醒相關（熱傷害）逐時預報
 * @param lat 緯度
 * @param lon 經度
 * @param signal 可選的 AbortSignal 用於取消請求
 */
export async function fetchHeatForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<HeatForecastResponse> {
  // 後端需要小數點格式，保留 6 位以避免網址過長
  if (!INDICATORS_BASE_URL) {
    throw new Error('VITE_INDICATORS_BASE_URL is not set')
  }
  const url = `${INDICATORS_BASE_URL}/heat/forecast?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`Heat forecast API failed: ${res.status}`)
  }
  const data = (await res.json()) as HeatForecastResponse
  return data
}

/**
 * 取得溫差提醒指數逐時預報
 */
export async function fetchTempDiffForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<TempDiffForecastResponse> {
  if (!INDICATORS_BASE_URL) {
    throw new Error('VITE_INDICATORS_BASE_URL is not set')
  }
  const url = `${INDICATORS_BASE_URL}/tempdiff/forecast?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`TempDiff forecast API failed: ${res.status}`)
  }
  const data = (await res.json()) as TempDiffForecastResponse
  return data
}

/**
 * 取得 AQI / PM2.5 即時資料
 */
export async function fetchAqiPm25(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<AqiPm25Response> {
  if (!INDICATORS_BASE_URL) {
    throw new Error('VITE_INDICATORS_BASE_URL is not set')
  }
  const url = `${INDICATORS_BASE_URL}/aqi/pm25?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`AQI pm25 API failed: ${res.status}`)
  }
  const data = (await res.json()) as AqiPm25Response
  return data
}
