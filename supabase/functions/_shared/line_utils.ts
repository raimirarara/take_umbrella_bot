import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"
import { Message } from "https://esm.sh/@line/bot-sdk@7.5.2"

const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET")
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")
if (!LINE_CHANNEL_SECRET || !LINE_CHANNEL_ACCESS_TOKEN) {
  throw new Error("LINE Developersの環境変数が設定されていません")
}

/**
 * 署名を検証
 */
export const validateSignature = (signature: string | null, body: string) => {
  const hash = hmac("sha256", LINE_CHANNEL_SECRET, body, "utf8", "base64") as string
  // 検証失敗したら401を返す
  if (hash !== signature) {
    console.error("unauthorized.")
    return new Response(null, { status: 401 })
  }
}

/**
 * ユーザにメッセージ送信
 */
// messageのtypeは内容によって大きく異なるためany[]を使用
export const pushMessage = async (userID: string, messages: Message[]) => {
  return await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userID, messages }),
  })
}

/**
 * ユーザからのメッセージに応答
 */
// messageのtypeは内容によって大きく異なるためany[]を使用
export const replyMessage = async (replyToken: string, messages: Message[]) => {
  return await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

/**
 * LINEメッセージのIDを使って音声データを取得する
 */
export const getAudioByMessageID = async (messageId: string) => {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })
  const blob = await response.blob()
  console.log(blob)
  const file = new File([blob], `${messageId}.m4a`) //拡張子を指定しないとWhisperAPI側でエラーになるので注意
  console.log(file)
  return file
}

/**
 * ユーザ名を取得する
 */
export const getUserName = async (userId: string): Promise<string> => {
  const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })

  if (response.ok) {
    const profile = await response.json()
    return profile.displayName as string
  } else {
    throw new Error(`Failed to get user profile. Status: ${response.status}`)
  }
}
