<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import BottomSheet from './molecules/BottomSheet.vue'
import LayerToggleButton from './molecules/LayerToggleButton.vue'
import type { LayerType } from '@/types/mapData'
import PointMarkers from './map/PointMarkers.vue'
import PolygonRegions from './map/PolygonRegions.vue'
import LayerSelector from './map/LayerSelector.vue'
import FilterButtons from './map/FilterButtons.vue'
import LocationList from './map/LocationList.vue'
import { mockPolygonRegions, filterButtons, allLocations } from '@/data/mockMapData'
import type { LayerType, FilterType, PointArea } from '@/types/mapData'

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: mapboxgl.Map | null = null

const map = computed(() => mapInstance)

// Bottom sheet state
const showLayerSheet = ref(false)
const showFilterSheet = ref(false)

// Active layer state
const activeLayer = ref<LayerType>('none')

// Filter state
const activeFilter = ref<FilterType | null>(null)

// Filtered locations based on active filter
const filteredLocations = computed(() => {
  if (!activeFilter.value) return []
  return allLocations.filter(location => location.type === activeFilter.value)
})

// Active filter button label
const activeFilterLabel = computed(() => {
  if (!activeFilter.value) return ''
  return filterButtons.find(btn => btn.id === activeFilter.value)?.label || ''
})

// Initialize map
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

// Toggle layer sheet
const toggleLayerSheet = () => {
  showLayerSheet.value = !showLayerSheet.value
}

// Handle layer selection
const handleSelectLayer = (layer: 'points' | 'regions') => {
  if (activeLayer.value === layer) {
    // Toggle off
    activeLayer.value = 'none'
  } else {
    // Show selected layer
    activeLayer.value = layer
  }
}

// Handle filter selection
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

// Handle location selection
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

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- Filter Buttons (Top) -->
    <FilterButtons
      :filters="filterButtons"
      :active-filter="activeFilter"
      @select-filter="handleSelectFilter"
    />

    <!-- Filter Buttons (Top) -->
    <FilterButtons
      :filters="filterButtons"
      :active-filter="activeFilter"
      @select-filter="handleSelectFilter"
    />

    <!-- Layer Toggle Button (Top Right) extracted component -->
    <LayerToggleButton
      :active="activeLayer !== 'none'"
      @click="toggleLayerSheet"
    />

    <!-- Bottom Sheet with LayerSelector content -->
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    </button>

    <!-- Map Layers -->
    <PointMarkers
      :map="map"
      :points="filteredLocations"
      :visible="activeFilter !== null"
    />
    <PolygonRegions
      :map="map"
      :regions="mockPolygonRegions"
      :visible="activeLayer === 'regions'"
    />

    <!-- Bottom Sheet for Layer Selection -->
    <BottomSheet v-model:isShow="showLayerSheet">
      <LayerSelector />
    </BottomSheet>

    <!-- Bottom Sheet for Filter Locations -->
    <BottomSheet v-model:isShow="showFilterSheet">
      <LocationList
        :locations="filteredLocations"
        :title="activeFilterLabel"
        @select-location="handleSelectLocation"
      />
    </BottomSheet>
  </div>
</template>
