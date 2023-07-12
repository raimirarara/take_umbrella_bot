// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { LocationMessage, Message, WebhookEvent, WebhookRequestBody } from "https://esm.sh/@line/bot-sdk@7.5.2"
import { getUserName, replyMessage, validateSignature } from "../_shared/line_utils.ts"
import { HowToSendLocationUrl } from "../_shared/Constants.ts"

serve(async (req) => {
  const body: WebhookRequestBody = await req.json()

  const events: WebhookEvent[] = body.events

  // 署名を検証
  validateSignature(req.headers.get("X-Line-Signature"), JSON.stringify(body))

  // Process all of the received events asynchronously.
  await Promise.all(
    events.map(async (event: WebhookEvent) => {
      const userId = event.source.userId
      const username = await getUserName(userId as string)

      if (event.type === "follow") {
        const replyToken = event.replyToken
        const reply: Message[] = [
          {
            type: "text",
            text: `${username}くん、フォローありがとう！\n` + "これから傘が必要に通知してあげよう！\n",
          },
          {
            type: "text",
            text: "まずはじめにこのトークでわしに位置情報を送ってくれ！\n" + "送り方: " + HowToSendLocationUrl + "\n",
          },
        ]
        await replyMessage(replyToken, reply)
        return
      }

      if (event.type === "message") {
        const replyToken = event.replyToken
        if (event.message.type === "location") {
          // TODO supabase上に位置情報か存在するかを取得

          // 存在しない場合、supabaseのlocationテーブルに位置情報を保存

          // 存在したら上書きするかを確認するメッセージを送信

          // 上書きする場合はsupabaseのlocationテーブルを更新

          const userLocation: LocationMessage = event.message
        }
      }
    })
  )

  return new Response("done.", { headers: { "Content-Type": "application/json" } })
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
