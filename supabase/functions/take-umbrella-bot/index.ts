// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Message, WebhookEvent, WebhookRequestBody } from "https://esm.sh/@line/bot-sdk@7.5.2"
import { getUserName, replyMessage, validateSignature } from "../_shared/line_utils.ts"
import { supabase } from "../_shared/supabaseClient.ts"
import { getRegionFromAddress } from "./getRegionFromAddress.ts"

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
            text: "まずはじめにこのトークでわしに位置情報を送ってくれ！",
            quickReply: {
              items: [
                {
                  type: "action",
                  action: { type: "location", label: "Location" },
                },
              ],
            },
          },
        ]
        // まずuserIdを保存
        await supabase.from("user").insert({ user_id: userId as string, umbrella_threshold: "60%" })
        await replyMessage(replyToken, reply)
        return
      }

      if (event.type === "postback") {
        const replyToken = event.replyToken
        const region = event.postback.data
        await supabase.from("user").update({ location: region }).eq("user_id", userId)
        await replyMessage(replyToken, [
          { type: "text", text: `位置情報を${region}で登録したぞ` },
          { type: "text", text: "これから傘が必要になるかどうか(降水確率70%以上)を通知してあげよう！" },
        ])
      }

      if (event.type === "message") {
        const replyToken = event.replyToken
        if (event.message.type === "location") {
          const region = getRegionFromAddress(event.message.address)
          // supabase上に位置情報か存在するかを取得
          const { data } = await supabase.from("user").select("*").eq("user_id", userId).single()
          // 存在しない場合、supabaseのlocationテーブルに位置情報を保存
          if (!data?.location) {
            await supabase.from("user").insert({ user_id: userId as string, location: region })
            await replyMessage(replyToken, [
              { type: "text", text: `ありがとう。位置情報を${region}で登録したぞ` },
              { type: "text", text: "これから傘が必要になるかどうか(降水確率70%以上)を通知してあげよう！" },
            ])
          }
          // 存在したら上書きするかを確認するメッセージを送信
          await replyMessage(replyToken, [
            {
              type: "template",
              altText: "this is a confirm template",
              template: {
                type: "confirm",
                text: `位置情報を${data?.location}で登録しているぞ。上書きするか？`,
                actions: [
                  {
                    type: "postback",
                    label: "Yes",
                    data: region,
                  },
                  {
                    type: "message",
                    label: "No",
                    text: "しない",
                  },
                ],
              },
            },
          ])
        }
        if (event.message.type === "text") {
          // supabase上で位置情報が登録されていない場合、位置情報を登録するように促す
          const { data } = await supabase.from("user").select("*").eq("user_id", userId).single()
          if (!data?.location) {
            await replyMessage(replyToken, [
              {
                type: "text",
                text: "わしに位置情報を送ってくれ！",
                quickReply: {
                  items: [
                    {
                      type: "action",
                      action: { type: "location", label: "Location" },
                    },
                  ],
                },
              },
            ])
          } else {
            await replyMessage(replyToken, [{ type: "text", text: `傘が必要なとき(降水確率70%以上)に通知してやるぞ` }])
          }
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
