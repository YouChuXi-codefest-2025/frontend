import mapboxgl from 'mapbox-gl'
import type { Ref } from 'vue'
import { getLocationFromFlutter, isInFlutterWebView } from './flutterBridge'

/**
 * 取得使用者位置（支援 Flutter WebView 和瀏覽器）
 */
async function getUserPosition(): Promise<{ latitude: number; longitude: number }> {
  if (isInFlutterWebView()) {
    const position = await getLocationFromFlutter()
    if (!position) {
      throw new Error('無法取得位置資訊')
    }
    return { latitude: position.latitude, longitude: position.longitude }
  } else {
    if (!navigator.geolocation) {
      throw new Error('您的瀏覽器不支援定位功能')
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }
  }
}

/**
 * 建立使用者位置標記
 */
function createUserMarker(): mapboxgl.Marker {
  const el = document.createElement('div')
  el.className = 'user-location-marker'
  el.style.cssText = `
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #4A90E2;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(74, 144, 226, 0.5);
    cursor: pointer;
  `
  return new mapboxgl.Marker(el)
}

/**
 * 處理錯誤訊息
 */
function getErrorMessage(error: any): string {
  if (error.code === 1) return '請允許定位權限'
  if (error.code === 2) return '無法取得位置資訊'
  if (error.code === 3) return '定位請求逾時'
  return error.message || '定位失敗'
}

/**
 * 定位到使用者位置
 */
export async function locateUser(
  mapInstance: any,
  userLocationMarker: Ref<any>,
  isLocating: Ref<boolean>
): Promise<void> {
  if (!mapInstance || isLocating.value) return

  isLocating.value = true

  try {
    const { latitude, longitude } = await getUserPosition()

    // 移除舊標記
    if (userLocationMarker.value) {
      userLocationMarker.value.remove()
    }

    // 建立並加入新標記
    userLocationMarker.value = createUserMarker()
      .setLngLat([longitude, latitude])
      .addTo(mapInstance)

    // 移動地圖到使用者位置
    mapInstance.flyTo({
      center: [longitude, latitude],
      zoom: 16,
      duration: 1500
    })
  } catch (error: any) {
    console.error('定位失敗:', error)
    alert(getErrorMessage(error))
  } finally {
    isLocating.value = false
  }
}

