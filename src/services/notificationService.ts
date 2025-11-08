/**
 * 通知服務
 * 使用 Flutter Bridge 發送通知
 */

import { showNotificationFromFlutter, isInFlutterWebView } from '@/utils/flutterBridge'
import type { PointArea } from '@/types/mapData'

export enum NotificationType {
  HEAT_INJURY = 'heat_injury',
  TEMPERATURE_DIFF = 'temperature_diff',
  COOL_SPOT_NEARBY = 'cool_spot_nearby'
}

// 通知冷卻時間（毫秒）- 避免重複通知
const COOLDOWN_TIME = 30 * 60 * 1000 // 30 分鐘
const lastNotificationTime: Map<NotificationType, number> = new Map()

/**
 * 檢查通知是否在冷卻時間內
 */
export function isNotificationInCooldown(type: NotificationType): boolean {
  const lastTime = lastNotificationTime.get(type)
  if (!lastTime) return false
  return Date.now() - lastTime < COOLDOWN_TIME
}

/**
 * 發送熱傷害警示
 */
export async function sendHeatInjuryAlert(heatIndex: number, nearestCoolSpot?: PointArea): Promise<void> {
  if (!isInFlutterWebView()) {
    console.log('[通知] 不在 Flutter 環境，跳過通知')
    return
  }

  if (isNotificationInCooldown(NotificationType.HEAT_INJURY)) {
    console.log('[通知] 熱傷害通知在冷卻時間內')
    return
  }

  // 設定閾值：熱傷害指數 >= 28 時發送通知
  if (heatIndex < 28) {
    console.log(`[通知] 熱傷害指數 ${heatIndex} 未達閾值`)
    return
  }

  const title = '熱傷害警示'
  let content = `目前熱傷害指數為 ${Math.round(heatIndex)}，請注意防曬與補充水分`
  
  if (nearestCoolSpot) {
    content += `\n附近涼適點：${nearestCoolSpot.name}`
  }

  try {
    await showNotificationFromFlutter(title, content)
    lastNotificationTime.set(NotificationType.HEAT_INJURY, Date.now())
    console.log('[通知] 已發送熱傷害警示')
  } catch (error) {
    console.error('[通知] 發送熱傷害警示失敗:', error)
  }
}

/**
 * 發送溫差提醒
 */
export async function sendTemperatureDifferenceAlert(tempDiff: number, diffIndex: number): Promise<void> {
  if (!isInFlutterWebView()) {
    console.log('[通知] 不在 Flutter 環境，跳過通知')
    return
  }

  if (isNotificationInCooldown(NotificationType.TEMPERATURE_DIFF)) {
    console.log('[通知] 溫差通知在冷卻時間內')
    return
  }

  // 設定閾值：溫差指數 >= 4 時發送通知（約 8°C 溫差）
  if (diffIndex < 4) {
    console.log(`[通知] 溫差指數 ${diffIndex} 未達閾值`)
    return
  }

  const title = '溫差提醒'
  const content = `今日溫差約 ${Math.round(tempDiff)}°C，請注意適時增減衣物`

  try {
    await showNotificationFromFlutter(title, content)
    lastNotificationTime.set(NotificationType.TEMPERATURE_DIFF, Date.now())
    console.log('[通知] 已發送溫差提醒')
  } catch (error) {
    console.error('[通知] 發送溫差提醒失敗:', error)
  }
}

/**
 * 發送涼適點附近提醒
 */
export async function sendCoolSpotNearbyAlert(spot: PointArea, distance: number): Promise<void> {
  if (!isInFlutterWebView()) {
    console.log('[通知] 不在 Flutter 環境，跳過通知')
    return
  }

  if (isNotificationInCooldown(NotificationType.COOL_SPOT_NEARBY)) {
    return
  }

  const title = '附近涼適點'
  const content = `${spot.name} 距離您約 ${Math.round(distance)} 公尺`

  try {
    await showNotificationFromFlutter(title, content)
    lastNotificationTime.set(NotificationType.COOL_SPOT_NEARBY, Date.now())
    console.log('[通知] 已發送涼適點提醒')
  } catch (error) {
    console.error('[通知] 發送涼適點提醒失敗:', error)
  }
}

