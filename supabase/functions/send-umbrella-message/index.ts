import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { pushMessage } from "../_shared/line_utils.ts"
import { supabase } from "../_shared/supabaseClient.ts"

serve(async (req: any) => {
  const { data: userData, error: userError } = await supabase.from("user").select("*")
  if (userError) {
    console.error(userError)
    throw userError
  }
  console.log({ userData })

  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })

  await Promise.allSettled(
    userData.map(async (user) => {
      const { data: weatherData, error: weatherError } = await supabase
        .from("weather")
        .select("*")
        .eq("date", today)
        .eq("location", user.location)
        .single()

      console.log({ weatherData })

      if (weatherError) {
        console.error(weatherError)
        throw weatherError
      }

      const rainProbabilityMorning = getRainProbability(weatherData.rain_probability_morning)
      const rainProbabilityNoon = getRainProbability(weatherData.rain_probability_noon)
      const rainProbabilityNight = getRainProbability(weatherData.rain_probability_night)

      if (rainProbabilityMorning >= 60 || rainProbabilityNoon >= 60 || rainProbabilityNight >= 70) {
        // 50%以上の降水確率がある場合の処理
        return pushMessage(user.user_id, [{ type: "text", text: "傘持ってけ！" }])
      } else {
        // 50%以上の降水確率がない場合の処理
        console.log("傘持ってけって言わない")
      }
    })
  )

  return new Response("必要な人に「傘持ってけ！」と送りました", { headers: { "Content-Type": "application/json" } })
})

function getRainProbability(probabilityString: string | null): number {
  const probability = Number(probabilityString?.replace("%", ""))
  return isNaN(probability) ? 0 : probability
}
