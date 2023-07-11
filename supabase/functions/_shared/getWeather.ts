const YAHOO_CLIENT_ID = Deno.env.get("YAHOO_CLIENT_ID")

// 降水情報を取得する
async function getWeatherInfo(location: { longitude: string; latitude: string }) {
  // 経度・緯度毎に半角スペース区切り
  const coordinates = `${location.longitude},${location.latitude}`
  const dates = formatDate(new Date())

  const isRainys = await Promise.all(dates.map((date) => getWeatherInfoByDate(coordinates, date)))

  return
}

async function getWeatherInfoByDate(coordinates: string, date: string): Promise<boolean> {
  // リクエストパラメータを作成
  const params = JSON.stringify({
    coordinates: coordinates,
    appid: YAHOO_CLIENT_ID, // アプリケーションID
    output: "json", // レスポンスをJSONにする
    date: date,
  })

  const url = "https://map.yahooapis.jp/weather/V1/place?" + params

  // 気象情報APIをコールする
  const res = await fetch(url)
  if (!res.ok) {
    throw res
  }
  const json = await res.json()
  console.log(JSON.stringify(json, null, "  "))
  return getIsRainy(json)
}

// 降水情報をテキストに変換する
function getIsRainy(weather: any) {
  let isRainy = false // 雨が降るか否か
  // 10分間隔でひとつでも雨が降るならtrue
  for (const w of weather.Feature.Property.WeatherList.Weather) {
    if (w.Rainfall > 0) {
      // 降水強度が0より大きいか
      isRainy = true
      break
    }
  }
  return isRainy
}

function formatDate(date: Date): string[] {
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return hours.map((hour) => year + month + day + hour + "00")
}

// 7時から21時
const hours = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"]
