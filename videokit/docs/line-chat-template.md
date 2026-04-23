# LINE Chat Template

`template.id = "line-chat"` で、LINE 風チャット動画をレンダリングできます。

現状は preview / render 向けのテンプレート実装まで入っていて、Editor 専用 UI はまだ `read-only preview` 扱いです。

## Main Fields

`timeline.chat`

- `mode`: `"dm"` or `"group"`
- `roomName`
- `groupName`
- `groupIcon`
- `myName`
- `myAvatar`
- `partnerName`
- `partnerAvatar`
- `partnerColor`
- `bgColor`
- `members[]`
- `messages[]`

## Message Fields

- `id`
- `sender`
- `text`
- `timestamp`
- `readReceipt`
- `typingFrames`
- `revealFrame`
- `duration`
- `voiceFile`
- `reaction`

## Example

```json
{
  "template": { "id": "line-chat" },
  "output": { "preset": "portrait-fhd" },
  "timeline": {
    "chat": {
      "mode": "dm",
      "roomName": "たかし",
      "myName": "私",
      "partnerName": "たかし",
      "partnerColor": "#38BDF8",
      "bgColor": "#B2DFDB",
      "messages": [
        {
          "id": "msg_001",
          "sender": "me",
          "text": "ねえ、昨日どこ行ってたの？",
          "timestamp": "21:34",
          "readReceipt": "既読",
          "revealFrame": 0,
          "duration": 90
        },
        {
          "id": "msg_002",
          "sender": "たかし",
          "text": "え、友達と飲んでただけだよ",
          "timestamp": "21:45",
          "typingFrames": 45,
          "revealFrame": 110,
          "duration": 90
        }
      ]
    }
  }
}
```
