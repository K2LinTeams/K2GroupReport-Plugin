import fetch from 'node-fetch'
import Config from '../config/config.js'

export default class LLM {
  static async analyze(history) {
    const { endpoint: BASE_URL, apiKey: API_KEY, model: MODEL } = Config.llm

    // Increase context window to 1000 messages (Gemini Flash can handle it)
    const recentMessages = history.slice(-1000).map(m => {
        const date = new Date(m.time)
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        // Limit content length per message strictly to avoid massive tokens if someone pasted a novel
        const content = m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content
        return `[${timeStr}] ${m.nickname}: ${content}`
    }).join('\n')

    const prompt = `
You are an entertaining and intelligent group chat analyst. Your task is to analyze the chat history and generate a fun, structured report.

**REQUIREMENTS:**
1. **MBTI & User Persona**: Entertainment speculation. Guess MBTI based on logic, emotion, and interaction. If info is insufficient, use stereotypes humorously.
2. **Group Bible (Quotes)**: Find sentences that were repeated multiple times, used many exclamation marks, or are absurdly funny. The "context" must explain *why* it was funny or what was happening.
3. **Language**: Use a fun, slightly "toxic" (playfully mean) or "internet slang" style suitable for a close friends group.

**OUTPUT FORMAT**:
Return ONLY a valid JSON object. No markdown formatting.
Structure:
{
  "summary": "A narrative summary of the day's events, formatted as a story.",
  "hot_topics": [
    { "title": "Topic", "count": 10, "description": "What happened" }
  ],
  "mbti_analysis": [
    { "nickname": "User", "mbti": "INTJ", "description": "Why you think so (funny reason)" }
  ],
  "group_bible": [
    { "quote": "The Quote", "user": "User", "context": "Context description" }
  ],
  "sentiment": "Positive/Negative/Chaos",
  "suggestion": "A fun suggestion for the group."
}

**CHAT HISTORY**:
${recentMessages}
`

    if (!API_KEY) {
        return this.getMockData()
    }

    try {
        const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [
                        { text: "You are a helpful assistant that analyzes chat logs and outputs strict JSON." }
                    ]
                },
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        })

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errText}`)
        }

        const data = await response.json()

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
             throw new Error("No candidates returned from Gemini API");
        }

        let content = data.candidates[0].content.parts[0].text

        // Clean up markdown if any remains (though responseMimeType should handle it)
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')

        return JSON.parse(content)

    } catch (err) {
        console.error('[K2GroupReport] LLM Analysis Error:', err)
        return {
            ...this.getMockData(),
            summary: "AI 分析服务连接失败，以下为模拟数据。错误信息: " + err.message
        }
    }
  }

  static getMockData() {
      return {
          summary: "今天群里就像菜市场一样热闹。Jules 还在苦逼地写代码，而其他人似乎都在摸鱼。主要讨论了如何把这个插件变得更花哨，以及大家对于 MBTI 的玄学探讨。",
          hot_topics: [
              { title: "插件开发", count: 99, description: "Jules 被迫营业的一天" },
              { title: "午饭吃啥", count: 20, description: "人类终极哲学问题" }
          ],
          mbti_analysis: [
              { nickname: "Jules", mbti: "ISTJ", description: "一丝不苟的代码机器，没有感情的杀手。" },
              { nickname: "路人乙", mbti: "ENFP", description: "在那儿傻乐，完全不知道发生了什么。" }
          ],
          group_bible: [
              { quote: "我再也不改需求了！", user: "Jules", context: "当被要求第100次修改UI时发出的绝望呐喊。" },
              { quote: "6", user: "复读机一号", context: "对所有事物的通用评价。" }
          ],
          sentiment: "Chaos",
          suggestion: "建议群主发个红包安抚一下民心。"
      }
  }
}
