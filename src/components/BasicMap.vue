<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
// 元件：底部抽屜、圖層切換按鈕、圖層選擇面板、篩選按鈕列、地點列表、點位標記、定位按鈕
import BottomSheet from './molecules/BottomSheet.vue'
import LayerToggleButton from './molecules/LayerToggleButton.vue'
import LocationButton from './molecules/LocationButton.vue'
import LayerSelector from './map/LayerSelector.vue'
import FilterButtons from './map/FilterButtons.vue'
import LocationList from './map/LocationList.vue'
import PointMarkers from './map/PointMarkers.vue'
import EnvIndicators from './map/EnvIndicators.vue'
// 資料與型別：篩選按鈕設定與所有點位資料
// 僅使用 API 資料來源，移除 mockMapData 依賴
import { fetchColdSpots, fetchAeds } from '@/api/sites'
import type { FilterType, PointArea } from '@/types/mapData'
// 定位工具
import { locateUser } from '@/utils/locationUtils'

// 地圖容器與實例
const mapContainer = ref<HTMLDivElement | null>(null)
const mapInstance = ref<mapboxgl.Map | null>(null) as any
// 地圖中心點（供 EnvIndicators 使用 API 時帶入）
const mapCenter = ref<{ lng: number; lat: number } | null>(null)

// 抽屜顯示狀態（圖層 / 篩選）
const showLayerSheet = ref(false)
const showFilterSheet = ref(false)

// 涼適點 + AED 數據（從 API 獲取）
const coldSpots = ref<PointArea[]>([])
const aedSpots = ref<PointArea[]>([])

// 所有地點數據（動態組合：涼適點 + AED）
const allLocations = computed<PointArea[]>(() => {
  return [
    ...coldSpots.value,
    ...aedSpots.value,
  ]
})

// 篩選狀態與衍生資料
const activeFilter = ref<FilterType | null>(null)
const filteredLocations = computed<PointArea[]>(() => {
  if (!activeFilter.value) return []
  return allLocations.value.filter(location => location.type === activeFilter.value)
})
const activeFilterLabel = computed(() => {
  if (!activeFilter.value) return ''
  return filterButtons.find(btn => btn.id === activeFilter.value)?.label || ''
})

// 定位相關狀態
const isLocating = ref(false)
const userLocationMarker = ref<mapboxgl.Marker | null>(null)

// 載入涼適點數據
const loadColdSpots = async () => {
  try {
    const spots = await fetchColdSpots()
    coldSpots.value = spots
  } catch (error) {
    console.error('載入涼適點數據失敗:', error)
    coldSpots.value = []
  }
}

// 載入 AED 數據
const loadAeds = async () => {
  try {
    const spots = await fetchAeds()
    aedSpots.value = spots
  } catch (error) {
    console.error('載入 AED 數據失敗:', error)
    aedSpots.value = []
  }
}

// 篩選按鈕（僅 API 資料來源）
const filterButtons: { id: 'cold' | 'AED_location'; label: string; color: string }[] = [
  { id: 'cold', label: '涼適點', color: '#5AB4C5' },
  { id: 'AED_location', label: 'AED', color: '#F97316' } // 橘色 (Tailwind orange-500)
]

// 地圖初始化（載入樣式與 MRT 路線）
onMounted(async () => {
  await Promise.all([loadColdSpots(), loadAeds()])

  const token = import.meta.env.VITE_MAPBOX_API_KEY
  if (!token) {
    console.warn('VITE_MAPBOX_API_KEY is not set')
  }
  mapboxgl.accessToken = token ?? ''

  if (!mapContainer.value) {
    return
  }

  mapInstance.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [121.56, 25.03],
    zoom: 15,
    minZoom: 6,
    maxZoom: 18,
    dragRotate: false,
    attributionControl: false, // 禁用 attribution control
    maxBounds: [
      [120.0, 21.8],
      [122.1, 25.4],
    ],
  })

  mapInstance.value.touchZoomRotate.disableRotation()
  mapInstance.value.touchPitch.disable()

  mapInstance.value.on('load', () => {
    if (!mapInstance.value) {
      return
    }

    // 初始化與後續移動結束時更新中心點
    const c = mapInstance.value.getCenter()
    mapCenter.value = { lng: c.lng, lat: c.lat }
    mapInstance.value.on('moveend', () => {
      const center = mapInstance.value!.getCenter()
      mapCenter.value = { lng: center.lng, lat: center.lat }
    })

    if (!mapInstance.value.getSource('mrt-routes')) {
      mapInstance.value.addSource('mrt-routes', {
        type: 'geojson',
        data: '/data/routes.geojson',
      })
    }

    if (!mapInstance.value.getLayer('mrt-routes-layer')) {
      mapInstance.value.addLayer({
        id: 'mrt-routes-layer',
        type: 'line',
        source: 'mrt-routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-width': 4,
          'line-color': [
            'match',
            ['get', 'RouteName'],
            '信義線', '#f9000f',
            '淡水線', '#f9000f',
            '木柵線', '#ce8d13',
            '內湖線', '#ce8d13',
            '蘆洲線', '#ffb600',
            '新莊線', '#ffb600',
            '中和線', '#ffb600',
            '板橋線', '#006bc2',
            '南港線', '#006bc2',
            '小南門線', '#008c5a',
            '松山線', '#008c5a',
            '新店線', '#008c5a',
            '碧潭支線', '#d0e300',
            '#808080',
          ],
        },
      })
    }
    // 地圖載入完成後自動定位
    locateUser(mapInstance.value, userLocationMarker, isLocating)
  })
})

// 事件：切換圖層抽屜
// const toggleLayerSheet = () => {
//   showLayerSheet.value = !showLayerSheet.value
// }

// 事件：選擇篩選（同一個則關閉）
const handleSelectFilter = (filter: FilterType) => {
  if (activeFilter.value === filter) {
    // Toggle off
    activeFilter.value = null
    showFilterSheet.value = false
  } else {
    // Show selected filter
    activeFilter.value = filter
    showFilterSheet.value = true
  }
}

// 事件：選擇地點後飛行並關閉篩選抽屜
const handleSelectLocation = (location: PointArea) => {
  if (mapInstance.value) {
    mapInstance.value.flyTo({
      center: [location.lon, location.lat],
      zoom: 17,
      duration: 1000
    })
    // Close the bottom sheet after selecting a location
    showFilterSheet.value = false
  }
}

// 事件：定位到使用者位置
const handleLocateUser = () => {
  locateUser(mapInstance.value, userLocationMarker, isLocating)
}

// 卸載：移除地圖實例避免記憶體洩漏
onUnmounted(() => {
  // 移除使用者位置標記
  if (userLocationMarker.value) {
    userLocationMarker.value.remove()
    userLocationMarker.value = null
  }

  // 移除地圖實例
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
})
</script>

<template>
  <div class="relative w-full h-full">
    <!-- 地圖主容器 -->
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- 涼適點標記 -->
    <PointMarkers
      :map="mapInstance"
      :points="activeFilter ? allLocations.filter(p => p.type === activeFilter) : []"
      :visible="true"
    />

    <!-- 篩選按鈕列（左上） -->
    <FilterButtons
      :filters="filterButtons"
      :active-filter="activeFilter"
      @select-filter="handleSelectFilter"
    />

    <!-- 環境指標列（置於篩選按鈕下方，左上） -->
    <div class="absolute top-16 left-4 right-20 z-40">
      <EnvIndicators :center="mapCenter" />
    </div>

    <!-- 圖層抽屜觸發按鈕（右上） -->
    <!-- <LayerToggleButton :active="showLayerSheet" @click="toggleLayerSheet" /> -->

    <!-- 定位按鈕（右下） -->
    <LocationButton :is-locating="isLocating" @click="handleLocateUser" />

    <!-- 圖層選擇抽屜 -->
    <!-- <BottomSheet v-model:isShow="showLayerSheet">
      <LayerSelector />
    </BottomSheet> -->

    <!-- 篩選結果地點抽屜 -->
    <BottomSheet v-model:isShow="showFilterSheet">
      <LocationList
        :locations="filteredLocations"
        :title="activeFilterLabel ? activeFilterLabel : '未選擇篩選'"
        @select-location="handleSelectLocation"
      />
    </BottomSheet>
  </div>
</template>

<style scoped>
/* 隱藏 Mapbox 左下角的浮水印 */
:deep(.mapboxgl-ctrl-logo),
:deep(.mapboxgl-ctrl-attrib) {
  display: none !important;
}
</style>
