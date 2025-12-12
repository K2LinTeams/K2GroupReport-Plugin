import fetch from 'node-fetch'

// In a real scenario, these should be loaded from a config file (e.g., config.yaml)
const API_ENDPOINT = process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
const API_KEY = process.env.LLM_API_KEY || ''
const MODEL = process.env.LLM_MODEL || 'gpt-3.5-turbo'

export default class LLM {
  static async analyze(history) {
    // Preprocess: Take last 300 messages to fit in context window and reduce noise
    // Format: [HH:MM] Nickname: Content
    const recentMessages = history.slice(-300).map(m => {
        const date = new Date(m.time)
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        // Limit content length per message
        const content = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content
        return `[${timeStr}] ${m.nickname}: ${content}`
    }).join('\n')

    const prompt = `
You are an intelligent group chat analyst. Your task is to analyze the following chat history and generate a structured report.

Return ONLY a valid JSON object. Do not wrap it in markdown code blocks. The JSON should have this structure:
{
  "summary": "A concise paragraph summarizing the main discussions and atmosphere of the chat today.",
  "hot_topics": [
    { "title": "Topic Name", "count": 10, "description": "Brief description of the discussion" }
  ],
  "active_users_analysis": [
    { "nickname": "User Name", "description": "One sentence describing their role/behavior today (e.g. 'The jokester', 'The tech expert')" }
  ],
  "sentiment": "One of: Positive, Neutral, Negative, Chaos",
  "suggestion": "A fun or helpful suggestion for the group based on the chat."
}

Chat History:
${recentMessages}
`

    if (!API_KEY) {
        // Mock response if no API key is configured
        return {
            summary: "（演示数据）群里今天充满了欢快的气氛，大家主要讨论了关于插件开发和午饭吃什么的话题。虽然有些许争论，但整体友善。",
            hot_topics: [
                { title: "插件开发", count: 42, description: "关于K2GroupReport插件的架构讨论" },
                { title: "午餐", count: 15, description: "讨论中午吃麦当劳还是肯德基" },
                { title: "摸鱼", count: 8, description: "大家都在上班摸鱼" }
            ],
            active_users_analysis: [
                { nickname: "也就是Jules", description: "疯狂写代码的工具人" },
                { nickname: "路人甲", description: "一直在发表情包" }
            ],
            sentiment: "Positive",
            suggestion: "建议大家早点休息，不要熬夜写代码。"
        }
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that analyzes chat logs and outputs strict JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        })

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`)
        }

        const data = await response.json()
        let content = data.choices[0].message.content

        // Strip Markdown code blocks if present
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')

        return JSON.parse(content)

    } catch (err) {
        console.error('[K2GroupReport] LLM Analysis Error:', err)
        // Return a fallback structure
        return {
            summary: "分析服务暂时不可用。",
            hot_topics: [],
            active_users_analysis: [],
            sentiment: "Unknown",
            suggestion: "请检查后台日志。"
        }
    }
  }
}
