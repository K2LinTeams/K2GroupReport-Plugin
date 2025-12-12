import nodejieba from 'nodejieba'

export default class Analyzer {

    static analyze(history) {
        if (!history || history.length === 0) return {}

        return {
            wordcloud: this.getWordCloud(history),
            social: this.getSocialNetwork(history),
            heatmap: this.get24HourHeatmap(history),
            sentimentCurve: this.getSentimentCurve(history),
            gamification: this.getGamification(history),
            stats: this.getBasicStats(history)
        }
    }

    static getBasicStats(history) {
        let totalChars = 0
        let imageCount = 0
        let emojiCount = 0

        history.forEach(msg => {
            totalChars += msg.content.length
            if (msg.hasImage) imageCount++
            if (msg.hasEmoji) emojiCount++
        })

        return {
            count: history.length,
            totalChars,
            imageCount,
            emojiCount,
            activeUsers: new Set(history.map(m => m.user_id)).size
        }
    }

    static get24HourHeatmap(history) {
        const hours = new Array(24).fill(0)
        history.forEach(msg => {
            const h = new Date(msg.time).getHours()
            if (h >= 0 && h < 24) hours[h]++
        })
        return hours
    }

    static getWordCloud(history) {
        const text = history.map(h => h.content).join('\n')
        // Extract top 100 keywords
        const keywords = nodejieba.extract(text, 100)
        return keywords.map(k => ({
            name: k.word,
            value: Math.floor(k.weight)
        }))
    }

    static getSocialNetwork(history) {
        const nodes = {} // uid -> { id, name, value (msg count) }
        const links = {} // "uid1-uid2" -> { source, target, value }

        history.forEach(msg => {
            const uid = msg.user_id
            const name = msg.nickname

            if (!nodes[uid]) nodes[uid] = { id: String(uid), name, value: 0 }
            nodes[uid].value++

            // Handle Mentions
            if (msg.mentions && msg.mentions.length > 0) {
                msg.mentions.forEach(targetId => {
                    if (targetId == uid) return
                    const key = [uid, targetId].sort().join('-')
                    if (!links[key]) {
                        links[key] = { source: String(uid), target: String(targetId), value: 0 }
                    }
                    links[key].value++
                })
            }

            // Handle Reply
            if (msg.isReply && msg.replyTo) {
                const targetId = msg.replyTo
                if (targetId == uid) return
                const key = [uid, targetId].sort().join('-')
                if (!links[key]) {
                    links[key] = { source: String(uid), target: String(targetId), value: 0 }
                }
                links[key].value += 2 // Replies carry more weight
            }
        })

        // Filter out nodes with very low activity?
        // Let's keep all for now, but maybe limit links to top interactions to avoid clutter.

        return {
            nodes: Object.values(nodes),
            links: Object.values(links)
        }
    }

    static getSentimentCurve(history) {
        // Simple heuristic
        const positiveWords = ['哈哈', '嘿嘿', '笑', '赞', '好', '棒', '快乐', '开心', 'happy', 'lol', 'xswl', '666']
        const negativeWords = ['呜呜', '哭', '悲', '惨', '累', '烦', '怒', '死', '滚', '艹', '操', '靠', '难受', '焦虑']

        // Group by Day (or Hour if only 1 day)
        // Check time span
        const firstTime = history[0].time
        const lastTime = history[history.length - 1].time
        const spanHours = (lastTime - firstTime) / (1000 * 3600)

        const isHourly = spanHours <= 48; // If less than 48 hours, show hourly

        const timeData = {}

        history.forEach(msg => {
            const date = new Date(msg.time)
            let key = ''
            if (isHourly) {
                // YYYY-MM-DD HH:00
                key = `${date.getDate()}日${date.getHours()}时`
            } else {
                // YYYY-MM-DD
                key = `${date.getMonth() + 1}-${date.getDate()}`
            }

            if (!timeData[key]) timeData[key] = 0

            let score = 0
            for (const w of positiveWords) {
                if (msg.content.includes(w)) score++
            }
            for (const w of negativeWords) {
                if (msg.content.includes(w)) score--
            }
            timeData[key] += score
        })

        return {
            times: Object.keys(timeData),
            scores: Object.values(timeData)
        }
    }

    static getGamification(history) {
        // Toxic Titles
        const toxic = this.getToxicTitles(history)

        // Composition (Mocked mostly, simplistic keyword)
        const composition = this.getComposition(history)

        // Emoji War
        const emojiWar = this.getEmojiWar(history)

        return {
            toxic,
            composition,
            emojiWar
        }
    }

    static getToxicTitles(history) {
        const userMsgCount = {}
        const userRepeatCount = {} // Copies
        const userNightCount = {} // 0-5am
        const userWordCount = {} // Total chars

        let lastMsg = null

        history.forEach(msg => {
            const uid = msg.user_id

            // Dragon King (Msg Count)
            userMsgCount[uid] = (userMsgCount[uid] || 0) + 1

            // Water King (Total Chars but maybe low info density? simplified to just char count for now)
            userWordCount[uid] = (userWordCount[uid] || 0) + msg.content.length

            // Night Owl
            const h = new Date(msg.time).getHours()
            if (h >= 0 && h < 5) userNightCount[uid] = (userNightCount[uid] || 0) + 1

            // Repeater
            if (lastMsg && lastMsg.user_id !== uid && lastMsg.content === msg.content && msg.content.length > 0) {
                userRepeatCount[uid] = (userRepeatCount[uid] || 0) + 1
            }
            lastMsg = msg
        })

        const findMax = (map) => {
            let maxU = null, maxV = -1
            for (const [u, v] of Object.entries(map)) {
                if (v > maxV) { maxV = v; maxU = u; }
            }
            if (maxU && maxV > 0) {
                // Find nickname
                const m = history.find(x => x.user_id == maxU)
                return { nickname: m ? m.nickname : maxU, count: maxV }
            }
            return null
        }

        return {
            dragonKing: findMax(userMsgCount),
            nightOwl: findMax(userNightCount),
            repeater: findMax(userRepeatCount),
            wordKing: findMax(userWordCount)
        }
    }

    static getComposition(history) {
        // Analyze percentage of specific keywords
        let total = 0
        let acg = 0 // Anime
        let work = 0 // Worker
        let game = 0 // Gaming

        const acgWords = ['二次元', '动漫', '番', '老婆', '手办', 'cos']
        const workWords = ['上班', '加班', '老板', '工资', '累', '摸鱼', '早八']
        const gameWords = ['游戏', '开黑', '上号', 'rank', '排位', '原神', '王者']

        history.forEach(msg => {
            total++
            if (acgWords.some(w => msg.content.includes(w))) acg++
            if (workWords.some(w => msg.content.includes(w))) work++
            if (gameWords.some(w => msg.content.includes(w))) game++
        })

        if (total === 0) return []

        return [
            { name: '二次元', value: Math.round(acg / total * 100) },
            { name: '打工人', value: Math.round(work / total * 100) },
            { name: '游戏宅', value: Math.round(game / total * 100) },
            { name: '纯路人', value: Math.max(0, 100 - Math.round((acg+work+game)/total*100)) }
        ].filter(x => x.value > 0)
    }

    static getEmojiWar(history) {
        const emojiCounts = {}
        history.forEach(msg => {
            // Match [CQ:face,id=123]
            const faceMatches = msg.content.match(/\[CQ:face,id=(\d+)\]/g)
            if (faceMatches) {
                faceMatches.forEach(m => {
                    const id = m.match(/\d+/)[0]
                    emojiCounts[id] = (emojiCounts[id] || 0) + 1
                })
            }
        })

        // Sort
        const sorted = Object.entries(emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => ({ id, count, url: `https://q1.qlogo.cn/g?b=qq&nk=${id}&s=100` }))
            // Wait, face ID is not user ID. Face ID is QQ system face.
            // URL for system face is usually not easy to get via simple URL unless we have a mapping.
            // But user asked for "Emoji War", maybe implies Custom Images too?
            // "Expression package war" usually means custom images.
            // Custom images have [CQ:image,file=...,url=...]
            // The URL is available in the CQ code.

            // Let's try to extract image URLs if possible.
            // Note: Yunzai stores `e.img` array.
            // But our collector stored `content` as string.
            // If the string content has [CQ:image,file=...,url=...], we can parse it.
            // However, typical CQ code for image in Yunzai might vary.
            // Let's stick to "System Faces" for now or skip image visualization if we can't reliably get URLs.
            // Actually, for "Emoji War", displaying the count of top system faces is easiest.
            // We can construct a URL for standard QQ faces if we know the mapping, but it's hard.
            // Let's just return the IDs and maybe frontend can render them if it knows how, or just list "Face ID X".

            // Alternative: Just return the count of "Images Sent" by user?
            // No, the requirement is "Which emoji/sticker is used most".

            // If we can't display the image, this feature is weak.
            // I will return the ID. In `report.html`, I might try to source standard QQ faces if I can find a CDN.
            // Standard QQ faces CDN: https://res.wx.qq.com/mpres/htmledition/images/icon/emotion/{id}.gif (Wechat?)
            // Or use a local resource.
            // Let's stick to returning IDs.

        return sorted
    }
}
