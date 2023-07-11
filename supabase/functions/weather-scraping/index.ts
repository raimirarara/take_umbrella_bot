// Importing necessary libraries
import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import axiod from "https://deno.land/x/axiod/mod.ts"

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

async function main(url: string) {
  // Fetch and parse HTML
  const doc = await fetchHTML(url)

  let dict: { [key: string]: Forecast[]; location?: any } = {}

  // Extract location
  const locationPattern = /(.+)の今日明日の天気/
  const location = doc.querySelector("title")?.textContent
  dict["location"] = location?.match(locationPattern)?.[1]
  console.log(`${dict["location"]}の天気`)

  const todayForecastEl = doc.querySelector(".today-weather")
  const tomorrowForecastEl = doc.querySelector(".tomorrow-weather")

  if (todayForecastEl) {
    dict["today"] = [await extractForecast(todayForecastEl)]
  }

  if (tomorrowForecastEl) {
    dict["tomorrow"] = [await extractForecast(tomorrowForecastEl)]
  }

  // Print JSON output
  // console.log(JSON.stringify(dict, null, 2));
}

async function fetchHTML(url: string) {
  const res = await axiod.get(url)
  const parser = new DOMParser()
  return parser.parseFromString(res.data, "text/html")!
}

async function extractForecast(soup: Element): Promise<Forecast> {
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

// Invoke the main function
main("https://tenki.jp/forecast/3/16/4410/13112/")
