<script setup lang="ts">
// 重構版：使用 Mapbox GeoJSON Source + Cluster Layers 取代 DOM Marker
import { watch, onUnmounted, ref, nextTick } from 'vue'
import mapboxgl from 'mapbox-gl'
import type { PointArea } from '@/types/mapData'

interface Props {
  map: mapboxgl.Map | null
  points: PointArea[]
  visible: boolean
}
const props = defineProps<Props>()

// Layer / Source IDs（集中管理避免衝突）
const SOURCE_ID = 'points-source'
const CLUSTER_LAYER_ID = 'points-clusters'
const CLUSTER_COUNT_LAYER_ID = 'points-cluster-count'
const UNCLUSTERED_LAYER_ID = 'points-unclustered'

const sourceAdded = ref(false)
let cleanupFns: Array<() => void> = []

// 類型對應顏色（與原先 DOM marker 一致）
const typeColorMap: Record<PointArea['type'], string> = {
  cold: '#5AB4C5',
  fire_safety: '#D45251',
  AED_location: '#F97316' // 橘色
}

// 取得目前主要的點位類型（此專案情境下，activeFilter 會讓 points 單一類型）
const getPrimaryType = (): PointArea['type'] | null => {
  const arr = props.points as PointArea[] | undefined
  const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined
  return first ? first.type : null
}

// 依類型回傳集群圈用的顏色 step 表達式
const getClusterColorExpression = (type: PointArea['type'] | null): any => {
  if (type === 'AED_location') {
    // 橘色系（點數越多顏色越深）
    return [
      'step',
      ['get', 'point_count'],
      '#FDBA74', // 少量（orange-300）
      10, '#FB923C', // 中等（orange-400）
      30, '#F97316' // 大量（orange-500）
    ]
  }
  // 預設（涼適點）維持原本藍色系
  return [
    'step',
    ['get', 'point_count'],
    '#71C5D5', // 小型集群
    10, '#5AB4C5',
    30, '#3A8DA0'
  ]
}

// 依當前主要類型更新集群樣式（顏色）
const updateClusterStyle = () => {
  const map = props.map
  if (!map || !map.getLayer(CLUSTER_LAYER_ID)) return
  const primary = getPrimaryType()
  const colorExpr = getClusterColorExpression(primary)
  map.setPaintProperty(CLUSTER_LAYER_ID, 'circle-color', colorExpr)
}

// 安全轉義字串避免 XSS（名稱等動態字串插入 HTML）
const escapeHtml = (str: string | undefined | null): string => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 將點位轉成 GeoJSON FeatureCollection
const buildGeoJSON = (): GeoJSON.FeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: props.points
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(p => ({
        type: 'Feature',
        properties: {
          id: p.id,
          name: p.name,
          type: p.type,
          location_type: p.location_type || '',
          address: p.address || '',
          district_name: p.district_name || '',
          open_hours: p.open_hours || '',
          notes: p.notes || '',
          facilities: p.facilities?.join('、') || ''
        },
        geometry: {
          type: 'Point',
          coordinates: [p.lon, p.lat]
        }
      })) as GeoJSON.Feature[]
  }
}

// 新增 Source 與 Layers（若尚未存在）
const ensureSourceAndLayers = () => {
  const map = props.map
  if (!map || !props.visible) return

  if (!sourceAdded.value) {
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildGeoJSON(),
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: 50
      })
    }
    sourceAdded.value = true
  }

  // 集群圈 layer
  if (!map.getLayer(CLUSTER_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': getClusterColorExpression(getPrimaryType()),
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16,
          10, 20,
          30, 26
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    })
  }

  // 集群文字 layer
  if (!map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    })
  }

  // 一般（未集群）點位 layer
  if (!map.getLayer(UNCLUSTERED_LAYER_ID)) {
    map.addLayer({
      id: UNCLUSTERED_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'type'],
          'cold', typeColorMap.cold,
          'fire_safety', typeColorMap.fire_safety,
          'AED_location', typeColorMap.AED_location,
          '#5AB4C5'
        ],
        'circle-radius': 8,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    })
  }

  // 事件：點擊集群 -> 展開
  const onClusterClick = (e: any) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] }) as any[]
    if (!features || !features.length) return
    const first = features[0]
    const clusterId = first && first.properties ? first.properties.cluster_id : undefined
    if (clusterId == null) return
    const source: any = map.getSource(SOURCE_ID)
    if (!source || typeof source.getClusterExpansionZoom !== 'function') return
    source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
      if (err) return
      const coords = (first.geometry as any)?.coordinates
      if (!coords) return
      map.easeTo({ center: coords, zoom })
    })
  }
  map.on('click', CLUSTER_LAYER_ID, onClusterClick)
  cleanupFns.push(() => map.off('click', CLUSTER_LAYER_ID, onClusterClick))

  // 事件：點擊未集群點 -> 顯示 popup
  const onPointClick = (e: any) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_LAYER_ID] }) as any[]
    if (!features || !features.length) return
    const f = features[0]
    const p: any = f.properties
    const color = typeColorMap[p.type as PointArea['type']] || '#5AB4C5'
    const coords = ((f as any).geometry as any).coordinates as [number, number]
    const [lon, lat] = coords
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${lat},${lon}`
    let html = `<div style="padding:12px;min-width:200px;max-width:280px;">`
    html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">`
    html += `<h3 style=\"margin:0;font-weight:bold;font-size:14px;\">`
    html += `<a href=\"${gmapsUrl}\" target=\"_blank\" rel=\"noopener\" style=\"color:${color};text-decoration:underline;\">${escapeHtml(p.name)}</a>`
    html += `</h3>`
    if (p.location_type) html += `<span style=\"font-size:12px;color:#666;\">${escapeHtml(p.location_type)}</span>`
    html += `</div>`
    const detail = (label: string, value: string) => value ? `<div style=\"display:flex;gap:6px;font-size:12px;color:#555;\"><span style=\"min-width:38px;font-weight:500;\">${label}</span><span style=\"white-space:pre-line;\">${value}</span></div>` : ''
    html += detail('地址：', p.address)
    html += detail('區域：', p.district_name)
    html += detail('時間：', p.open_hours)
    html += detail('設施：', p.facilities)
    html += detail('備註：', p.notes)
    html += `</div>`
    new mapboxgl.Popup({ offset: 20 })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map)
  }
  map.on('click', UNCLUSTERED_LAYER_ID, onPointClick)
  cleanupFns.push(() => map.off('click', UNCLUSTERED_LAYER_ID, onPointClick))

  // 滑鼠樣式
  const onMouseEnter = () => map.getCanvas().style.cursor = 'pointer'
  const onMouseLeave = () => map.getCanvas().style.cursor = ''
  map.on('mouseenter', UNCLUSTERED_LAYER_ID, onMouseEnter)
  map.on('mouseleave', UNCLUSTERED_LAYER_ID, onMouseLeave)
  cleanupFns.push(() => {
    map.off('mouseenter', UNCLUSTERED_LAYER_ID, onMouseEnter)
    map.off('mouseleave', UNCLUSTERED_LAYER_ID, onMouseLeave)
  })
}

// 更新 source 資料（點位變更時）
const updateSourceData = () => {
  if (!props.map || !sourceAdded.value) return
  const source: any = props.map.getSource(SOURCE_ID)
  if (source) {
    source.setData(buildGeoJSON())
  }
  updateClusterStyle()
}

// 移除所有相關資源
const removeAll = () => {
  const map = props.map
  if (!map) return
  cleanupFns.forEach(fn => fn())
  cleanupFns = []
  ;[CLUSTER_COUNT_LAYER_ID, CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id)
  })
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  sourceAdded.value = false
}

// 監聽：map / visible / points 變動
watch(
  () => [props.map, props.visible],
  ([mapRef, vis]) => {
    const map = mapRef as mapboxgl.Map | null
    if (map && vis) {
      if ((map as any).loaded && (map as any).loaded()) {
        ensureSourceAndLayers()
        updateSourceData()
      } else {
        (map as any).once('load', () => {
          ensureSourceAndLayers()
          updateSourceData()
        })
      }
    } else {
      removeAll()
    }
  },
  { immediate: true }
)

watch(
  () => props.points,
  () => {
    // 延遲到下一 tick，確保 source 已建立
    nextTick(() => {
      updateSourceData()
      updateClusterStyle()
    })
  },
  { deep: true }
)

onUnmounted(() => removeAll())
</script>

<!-- 此組件不渲染任何 DOM，自身僅管理 Mapbox 圖層 -->
<template></template>

