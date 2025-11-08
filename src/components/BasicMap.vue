<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: mapboxgl.Map | null = null

onMounted(() => {
  const token = import.meta.env.VITE_MAPBOX_API_KEY
  if (!token) {
    // 提示：缺少金鑰時仍建立地圖實例，但地圖樣式將無法正確載入
    console.warn('VITE_MAPBOX_API_KEY is not set')
  }
  mapboxgl.accessToken = token ?? ''

  if (!mapContainer.value) {
    return
  }

  map = new mapboxgl.Map({
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

  map.touchZoomRotate.disableRotation()
  map.touchPitch.disable()

  map.on('load', () => {
    if (!map) {
      return
    }

    if (!map.getSource('mrt-routes')) {
      map.addSource('mrt-routes', {
        type: 'geojson',
        data: '/data/routes.geojson',
      })
    }

    if (!map.getLayer('mrt-routes-layer')) {
      map.addLayer({
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

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
 </template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
