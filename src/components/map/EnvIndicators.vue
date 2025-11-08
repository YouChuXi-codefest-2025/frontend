<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchTempDiffForecast, fetchHeatForecast, type TempDiffForecastResponse, type HeatForecastResponse } from '@/api/indicators'
import { sendHeatInjuryAlert, sendTemperatureDifferenceAlert } from '@/services/notificationService'

interface IndicatorItem {
  id: string
  label: string
  value: string | number
  icon?: 'heat' | 'aqi' | 'delta'
}

interface Props {
  items?: IndicatorItem[]
  center?: { lng: number; lat: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  items: () => ([
    { id: 'delta', label: '溫差提醒指數', value: '—', icon: 'delta' },
    { id: 'heat', label: '熱傷害指數', value: '—', icon: 'heat' },
    { id: 'aqi', label: 'AQI', value: '—', icon: 'aqi' }
  ])
})

// 本地可寫入的指標資料（從 props 初始化）
const indicators = ref<IndicatorItem[]>([...props.items])
const locationLabel = ref<string>('')

// 若父層傳入 items（非預設），同步到本地
watch(
  () => props.items,
  (val) => { if (val) indicators.value = [...val] },
  { deep: true }
)

// 依中心點呼叫 API：同時取得下一個時段的「溫差提醒指數」與「熱傷害指數」
let debounceTimer: number | undefined
let controller: AbortController | null = null

watch(
  () => props.center,
  (center) => {
    if (!center || isNaN(center.lat) || isNaN(center.lng)) return
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(async () => {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal

      // 小工具：從回傳項目中抽取代表指數的數值
      const extractIndex = (item: any, candidates: string[]): number | undefined => {
        for (const key of candidates) {
          if (item && typeof item[key] === 'number' && Number.isFinite(item[key])) return item[key] as number
        }
        if (item) {
          for (const k of Object.keys(item)) {
            if (k === 'issue_time' || typeof item[k] !== 'number') continue
            const n = item[k]
            if (Number.isFinite(n as number)) return n as number
          }
        }
        return undefined
      }

      const now = new Date()
      try {
        // 並行請求：溫差與熱傷害
        const [tempRes, heatRes] = await Promise.allSettled<
          [PromiseFulfilledResult<TempDiffForecastResponse> | PromiseRejectedResult,
           PromiseFulfilledResult<HeatForecastResponse> | PromiseRejectedResult]
        >([
          // 包一層 Promise.resolve 以滿足 TS 推斷
          Promise.resolve(fetchTempDiffForecast(center.lat, center.lng, signal)) as any,
          Promise.resolve(fetchHeatForecast(center.lat, center.lng, signal)) as any
        ]) as unknown as [PromiseSettledResult<TempDiffForecastResponse>, PromiseSettledResult<HeatForecastResponse>]

        // 溫差提醒指數（delta）
        let labelFromTemp: string | undefined
        if (tempRes.status === 'fulfilled') {
          const tData = tempRes.value
          const tNext = tData.forecasts.find(f => new Date((f as any).issue_time) >= now) ?? tData.forecasts[tData.forecasts.length - 1]
          const tValue = tNext ? (extractIndex(tNext, ['temp_diff_index', 'temperature_difference_index', 'index', 'value'])) : undefined
          indicators.value = indicators.value.map(i => i.id === 'delta' ? { ...i, value: (tValue ?? '—') } : i)
          labelFromTemp = [tData.city, tData.district].filter(Boolean).join(' ')
          
          // 發送溫差通知（指數 >= 4，約 8°C 溫差）
          if (typeof tValue === 'number' && tValue >= 4) {
            sendTemperatureDifferenceAlert(tValue * 2, tValue).catch(console.error)
          }
        }

        // 熱傷害指數（heat）
        let labelFromHeat: string | undefined
        if (heatRes.status === 'fulfilled') {
          const hData = heatRes.value
          const hNext = hData.forecasts.find(f => new Date((f as any).issue_time) >= now) ?? hData.forecasts[hData.forecasts.length - 1]
          const hValue = hNext ? (extractIndex(hNext, ['heat_injury_index', 'heat_index', 'index', 'value'])) : undefined
          indicators.value = indicators.value.map(i => i.id === 'heat' ? { ...i, value: (hValue ?? '—') } : i)
          labelFromHeat = [hData.city, hData.district].filter(Boolean).join(' ')
          
          // 發送熱傷害通知（指數 >= 28）
          if (typeof hValue === 'number' && hValue >= 28) {
            sendHeatInjuryAlert(hValue).catch(console.error)
          }
        }

        // 始終更新地區標籤（原本只在空時更新造成不會隨移動改變）
        const newLabel = labelFromTemp || labelFromHeat || ''
        locationLabel.value = newLabel
      } catch (_) {
        // 靜默處理；保留既有顯示
      }
    }, 300)
  },
  { immediate: true }
)
</script>

<template>
  <!-- 地區 + 垂直堆疊三個指標，每個指標內仍為橫向排列文字與數值 -->
  <div class="flex flex-col items-start gap-2">
    <!-- 地區文字 -->
    <div class="inline-flex items-center px-3 py-1.5 rounded-xl bg-black/60 text-white shadow-md backdrop-blur-sm border border-white/10">
      <span class="text-xs text-white/90">{{ locationLabel || '—' }}</span>
    </div>

    <div
      v-for="item in indicators"
      :key="item.id"
      class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 text-white shadow-md backdrop-blur-sm border border-white/10"
    >
      <!-- 小圖示：內嵌 SVG，確保無外部依賴 -->
      <span class="w-5 h-5 text-white/90" aria-hidden="true">
        <!-- heat -->
        <svg v-if="item.icon === 'heat'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <path d="M14 4a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0Z"/>
          <path d="M10 9h4"/>
        </svg>
        <!-- aqi -->
        <svg v-else-if="item.icon === 'aqi'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <path d="M3 12h18"/>
          <path d="M7 12a5 5 0 0 1 10 0"/>
        </svg>
        <!-- delta -->
        <svg v-else-if="item.icon === 'delta'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <path d="M3 20h18"/>
          <path d="M4 20L12 4l8 16"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      </span>

      <div class="flex items-baseline gap-2">
        <span class="text-xs text-white/80 tracking-wide">{{ item.label }}</span>
        <span class="text-sm font-semibold">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
