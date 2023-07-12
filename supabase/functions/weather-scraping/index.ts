// Importing necessary libraries
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"
import axiod from "https://deno.land/x/axiod@0.26.2/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ku27, tama } from "../_shared/Constants.ts"
import { supabase } from "../_shared/supabaseClient.ts"

type Forecast = {
  date: string
  weather: string
  high_temp: string
  high_temp_diff: string
  low_temp: string
  low_temp_diff: string
  rain_probability: { [key: string]: string }
  wind_wave: string
}

async function main(url: string, date: string, region: string) {
  // Fetch and parse HTML
  const doc = await fetchHTML(url)

  let dict: { [key: string]: Forecast[]; location?: any } = {}

  // Extract location
  const locationPattern = /(.+)の今日明日の天気/
  const location = doc.querySelector("title")?.textContent
  dict["location"] = location?.match(locationPattern)?.[1]
  if (region != dict["location"]) {
    throw new Error("tenki.jpの地域名と呼出し地域が一致していません。tenki.jpのHTML構造が変わったかもしれません。")
  }

  const todayForecastEl = doc.querySelector(".today-weather")
  // const tomorrowForecastEl = doc.querySelector(".tomorrow-weather")

  if (!todayForecastEl) throw new Error("Failed to extract today's forecast")

  const data = extractForecast(todayForecastEl)

  const insertData: {
    date: string
    high_temp?: string | null
    high_temp_diff?: string | null
    location: string
    low_temp?: string | null
    low_temp_diff?: string | null
    rain_probability_morning?: string | null
    rain_probability_night?: string | null
    rain_probability_noon?: string | null
    weather?: string | null
    wind_wave?: string | null
  } = {
    date: date,
    high_temp: data.high_temp,
    high_temp_diff: data.high_temp_diff,
    location: region,
    low_temp: data.low_temp,
    low_temp_diff: data.low_temp_diff,
    rain_probability_morning: data.rain_probability["06-12"],
    rain_probability_noon: data.rain_probability["12-18"],
    rain_probability_night: data.rain_probability["18-24"],
    weather: data.weather,
    wind_wave: data.wind_wave,
  }

  const { error } = await supabase.from("weather").upsert(insertData)
  if (error) throw error
}

async function fetchHTML(url: string) {
  const res = await axiod.get(url)
  const parser = new DOMParser()
  return parser.parseFromString(res.data, "text/html")!
}

function extractForecast(soup: Element): Forecast {
  // Extract date
  const datePattern = /(\d+)月(\d+)日\(([土日月火水木金])+\)/
  const dateMatch = soup.querySelector(".left-style")?.textContent?.match(datePattern)

  // Initialize Forecast object
  let data: Forecast = {
    date: `${dateMatch?.[1]}-${dateMatch?.[2]}(${dateMatch?.[3]})`,
    weather: soup.querySelector(".weather-telop")?.textContent?.trim() ?? "",
    high_temp: soup.querySelector("[class='high-temp temp']")?.textContent?.trim() ?? "",
    high_temp_diff: soup.querySelector("[class='high-temp tempdiff']")?.textContent?.trim() ?? "",
    low_temp: soup.querySelector("[class='low-temp temp']")?.textContent?.trim() ?? "",
    low_temp_diff: soup.querySelector("[class='low-temp tempdiff']")?.textContent?.trim() ?? "",
    rain_probability: {
      "00-06": "",
      "06-12": "",
      "12-18": "",
      "18-24": "",
    },
    wind_wave: soup.querySelector(".wind-wave > td")?.textContent?.trim() ?? "",
  }

  // Extract rain probability
  const rainProbElems = Array.from(soup.querySelectorAll(".rain-probability > td"))
  const timeSlots = ["00-06", "06-12", "12-18", "18-24"]

  for (let i = 0; i < rainProbElems.length; i++) {
    data.rain_probability[timeSlots[i]] = rainProbElems[i].textContent?.trim() ?? ""
  }

  console.log(`
    天気：${data.weather}
    最高気温(C)：${data.high_temp}
    最高気温差(C)：${data.high_temp_diff}
    最低気温(C)：${data.low_temp}
    最低気温差(C)：${data.low_temp_diff}
    降水確率[00-06]：${data.rain_probability["00-06"]}
    降水確率[06-12]：${data.rain_probability["06-12"]}
    降水確率[12-18]：${data.rain_probability["12-18"]}
    降水確率[18-24]：${data.rain_probability["18-24"]}
    風向：${data.wind_wave}
  `)

  return data
}

serve(async (req: any) => {
  // Invoke the main function
  // console.log(req.json())
  // const region = req.json().region as string
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
  for (const [region, regionNumber] of Object.entries(ku27)) {
    const reqUrl = `https://tenki.jp/forecast/3/16/4410/131${regionNumber}/`
    await main(reqUrl, today, region)
  }
  for (const [region, regionNumber] of Object.entries(tama)) {
    const reqUrl = `https://tenki.jp/forecast/3/16/4410/132${regionNumber}/`
    await main(reqUrl, today, region)
  }
  return new Response(today + "の天気をDBに保存しました。", { headers: { "Content-Type": "application/json" } })
})
