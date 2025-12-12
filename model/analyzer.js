import nodejieba from 'nodejieba'

export default class Analyzer {
    /**
     * Generate Word Cloud data
     * @param {Array} history
     * @returns {Array} List of {name: word, value: count}
     */
    static getWordCloud(history) {
        if (!history || history.length === 0) return []

        // Extract text content only
        const textContent = history
            .map(h => h.content)
            .join('\n')

        // Extract keywords
        // topN = 50
        const keywords = nodejieba.extract(textContent, 50)

        // Map to echarts format
        return keywords.map(k => ({
            name: k.word,
            value: Math.floor(k.weight) // extract returns weight, usually float.
            // Wait, nodejieba.extract returns {word: string, weight: number} based on TF-IDF usually.
            // If we want simple frequency, we might need cut and count manually.
            // But extract is usually good enough for word cloud "importance".
        }))
    }

    /**
     * Get Toxic Titles
     * @param {Array} history
     * @returns {Object} { dragonKing: User, repeater: User, nightOwl: User }
     */
    static getToxicTitles(history) {
        if (!history || history.length === 0) return {}

        // Dragon King (Most Messages)
        const userMsgCount = {}
        // Repeater (Most copied messages) - this is tricky.
        // Definition: "Frequently copies others".
        // Heuristic: Count how many times a user sent a message that was identical to the IMMEDIATE previous message (by someone else).
        const userRepeatCount = {}
        // Night Owl (Most messages between 00:00 - 05:00)
        const userNightCount = {}

        let lastMsg = null

        for (const msg of history) {
            const uid = msg.user_id
            const content = msg.content

            // Dragon King
            userMsgCount[uid] = (userMsgCount[uid] || 0) + 1

            // Night Owl
            const date = new Date(msg.time)
            const hour = date.getHours()
            if (hour >= 0 && hour < 5) {
                userNightCount[uid] = (userNightCount[uid] || 0) + 1
            }

            // Repeater
            if (lastMsg && lastMsg.user_id !== uid && lastMsg.content === content) {
                 // Check if content is long enough to be significant? "嗯" or "6" might not count?
                 // Let's assume exact match is enough for now.
                 if (content.length > 0) {
                     userRepeatCount[uid] = (userRepeatCount[uid] || 0) + 1
                 }
            }
            lastMsg = msg
        }

        // Find maxes
        const getTopUser = (map) => {
            let maxUser = null
            let maxCount = -1
            for (const [uid, count] of Object.entries(map)) {
                if (count > maxCount) {
                    maxCount = count
                    maxUser = uid
                }
            }
            return maxUser ? { user_id: maxUser, count: maxCount } : null
        }

        const dragonKing = getTopUser(userMsgCount)
        const nightOwl = getTopUser(userNightCount)
        const repeater = getTopUser(userRepeatCount)

        // Enhance with nickname (find last nickname used by this user)
        const getNickname = (uid) => {
            const msg = history.slice().reverse().find(m => m.user_id == uid)
            return msg ? msg.nickname : 'Unknown'
        }

        return {
            dragonKing: dragonKing ? { ...dragonKing, nickname: getNickname(dragonKing.user_id) } : null,
            nightOwl: nightOwl ? { ...nightOwl, nickname: getNickname(nightOwl.user_id) } : null,
            repeater: repeater ? { ...repeater, nickname: getNickname(repeater.user_id) } : null
        }
    }
}
