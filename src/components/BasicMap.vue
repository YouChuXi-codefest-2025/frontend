<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
// 元件：底部抽屜、圖層切換按鈕、圖層選擇面板、篩選按鈕列、地點列表
import BottomSheet from './molecules/BottomSheet.vue'
import LayerToggleButton from './molecules/LayerToggleButton.vue'
import LayerSelector from './map/LayerSelector.vue'
import FilterButtons from './map/FilterButtons.vue'
import LocationList from './map/LocationList.vue'
// 資料與型別：篩選按鈕設定與所有點位資料
import { filterButtons, allLocations } from '@/data/mockMapData'
import type { FilterType, PointArea } from '@/types/mapData'

// 地圖容器與實例
const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: mapboxgl.Map | null = null

// 抽屜顯示狀態（圖層 / 篩選）
const showLayerSheet = ref(false)
const showFilterSheet = ref(false)

// 篩選狀態與衍生資料
const activeFilter = ref<FilterType | null>(null)
const filteredLocations = computed<PointArea[]>(() => {
  if (!activeFilter.value) return []
  return allLocations.filter(location => location.type === activeFilter.value)
})
const activeFilterLabel = computed(() => {
  if (!activeFilter.value) return ''
  return filterButtons.find(btn => btn.id === activeFilter.value)?.label || ''
})

// 地圖初始化（載入樣式與 MRT 路線）
onMounted(() => {
  const token = import.meta.env.VITE_MAPBOX_API_KEY
  if (!token) {
    console.warn('VITE_MAPBOX_API_KEY is not set')
  }
  mapboxgl.accessToken = token ?? ''

  if (!mapContainer.value) {
    return
  }

  mapInstance = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [121.56, 25.03],
    zoom: 15,
    minZoom: 6,
    maxZoom: 18,
    dragRotate: false,
    maxBounds: [
      [120.0, 21.8],
      [122.1, 25.4],
    ],
  })

  mapInstance.touchZoomRotate.disableRotation()
  mapInstance.touchPitch.disable()

  mapInstance.on('load', () => {
    if (!mapInstance) {
      return
    }

    if (!mapInstance.getSource('mrt-routes')) {
      mapInstance.addSource('mrt-routes', {
        type: 'geojson',
        data: '/data/routes.geojson',
      })
    }

    if (!mapInstance.getLayer('mrt-routes-layer')) {
      mapInstance.addLayer({
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
  })
})

// 事件：切換圖層抽屜
const toggleLayerSheet = () => {
  showLayerSheet.value = !showLayerSheet.value
}

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
  if (mapInstance) {
    mapInstance.flyTo({
      center: [location.lon, location.lat],
      zoom: 17,
      duration: 1000
    })
    // Close the bottom sheet after selecting a location
    showFilterSheet.value = false
  }
}

// 卸載：移除地圖實例避免記憶體洩漏
onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <div class="relative w-full h-full">
    <!-- 地圖主容器 -->
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- 篩選按鈕列（左上） -->
    <FilterButtons
      :filters="filterButtons"
      :active-filter="activeFilter"
      @select-filter="handleSelectFilter"
    />

    <!-- 圖層抽屜觸發按鈕（右上） -->
    <LayerToggleButton :active="showLayerSheet" @click="toggleLayerSheet" />

    <!-- 圖層選擇抽屜 -->
    <BottomSheet v-model:isShow="showLayerSheet">
      <LayerSelector />
    </BottomSheet>

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
