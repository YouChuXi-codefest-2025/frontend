/**
 * Flutter WebView 橋接工具
 * 用於與 Flutter App 的 WebView 進行雙向通訊
 */

export interface FlutterPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number
  heading: number
  speed: number
  speedAccuracy: number
  timestamp: number
}

export interface FlutterMessage {
  name: string
  data: any
}

/**
 * 檢查是否在 Flutter WebView 環境中
 */
export function isInFlutterWebView(): boolean {
  return typeof (window as any).flutterObject !== 'undefined'
}

/**
 * 向 Flutter 發送訊息
 */
export function postMessageToFlutter(name: string, data: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isInFlutterWebView()) {
      reject(new Error('不在 Flutter WebView 環境中'))
      return
    }

    try {
      // 發送訊息到 Flutter
      const message = JSON.stringify({ name, data })
      ;(window as any).flutterObject.postMessage(message)

      // 監聽回覆
      const handleMessage = (event: MessageEvent) => {
        try {
          const response: FlutterMessage = JSON.parse(event.data)
          if (response.name === name) {
            window.removeEventListener('message', handleMessage)
            resolve(response.data)
          }
        } catch (error) {
          console.error('解析 Flutter 回覆失敗:', error)
        }
      }

      window.addEventListener('message', handleMessage)

      // 設定超時（10秒）
      setTimeout(() => {
        window.removeEventListener('message', handleMessage)
        reject(new Error('Flutter 回覆超時'))
      }, 10000)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 從 Flutter 取得使用者位置
 */
export async function getLocationFromFlutter(): Promise<FlutterPosition | null> {
  try {
    const position = await postMessageToFlutter('location', null)

    // 如果返回空陣列，表示取得位置失敗
    if (Array.isArray(position) && position.length === 0) {
      throw new Error('無法取得位置資訊')
    }

    return position as FlutterPosition
  } catch (error) {
    console.error('從 Flutter 取得位置失敗:', error)
    throw error
  }
}

/**
 * 取得裝置資訊
 */
export async function getDeviceInfoFromFlutter(): Promise<any> {
  try {
    return await postMessageToFlutter('deviceinfo', null)
  } catch (error) {
    console.error('從 Flutter 取得裝置資訊失敗:', error)
    throw error
  }
}

/**
 * 取得使用者資訊
 */
export async function getUserInfoFromFlutter(): Promise<any> {
  try {
    return await postMessageToFlutter('userinfo', null)
  } catch (error) {
    console.error('從 Flutter 取得使用者資訊失敗:', error)
    throw error
  }
}

/**
 * 開啟地圖應用
 */
export async function launchMapFromFlutter(url: string): Promise<boolean> {
  try {
    return await postMessageToFlutter('launch_map', url)
  } catch (error) {
    console.error('開啟地圖應用失敗:', error)
    return false
  }
}

/**
 * 撥打電話
 */
export async function makePhoneCallFromFlutter(phoneNumber: string): Promise<boolean> {
  try {
    return await postMessageToFlutter('phone_call', phoneNumber)
  } catch (error) {
    console.error('撥打電話失敗:', error)
    return false
  }
}

/**
 * 掃描 QR Code
 */
export async function scanQRCodeFromFlutter(): Promise<string | null> {
  try {
    return await postMessageToFlutter('qr_code_scan', null)
  } catch (error) {
    console.error('掃描 QR Code 失敗:', error)
    return null
  }
}

/**
 * 顯示通知
 */
export async function showNotificationFromFlutter(title: string, content: string): Promise<void> {
  try {
    await postMessageToFlutter('notify', { title, content })
  } catch (error) {
    console.error('顯示通知失敗:', error)
  }
}
