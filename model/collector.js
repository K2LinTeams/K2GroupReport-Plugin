import fs from 'fs'
import path from 'path'

const DataDir = './data/K2GroupReport/history'
const MaxHistory = 2000

if (!fs.existsSync(DataDir)) {
  fs.mkdirSync(DataDir, { recursive: true })
}

export default class Collector {
  /**
   * Save a message
   * @param {object} e - The event object (message)
   */
  static async save(e) {
    if (!e.group_id) return

    const groupId = e.group_id
    const file = path.join(DataDir, `${groupId}.json`)

    let history = []
    if (fs.existsSync(file)) {
      try {
        history = JSON.parse(fs.readFileSync(file, 'utf8'))
      } catch (err) {
        console.error(`[K2GroupReport] Error reading history for group ${groupId}`, err)
        history = []
      }
    }

    // Extract relevant info
    let hasImage = false
    let hasEmoji = false

    if (Array.isArray(e.message)) {
        hasImage = e.message.some(m => m.type === 'image')
        hasEmoji = e.message.some(m => m.type === 'face')
    }

    const record = {
      user_id: e.user_id,
      nickname: e.sender.card || e.sender.nickname,
      time: e.time * 1000, // Convert to ms
      content: e.toString(),
      type: e.img ? 'image' : 'text', // Simple heuristic
      hasImage,
      hasEmoji
    }

    history.push(record)

    // Prune
    if (history.length > MaxHistory) {
      history = history.slice(history.length - MaxHistory)
    }

    fs.writeFileSync(file, JSON.stringify(history, null, 2))
  }

  /**
   * Get history for a group
   * @param {number} groupId
   * @returns {Array}
   */
  static getHistory(groupId) {
    const file = path.join(DataDir, `${groupId}.json`)
    if (!fs.existsSync(file)) return []
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
        console.error(`[K2GroupReport] Error reading history for group ${groupId}`, err)
      return []
    }
  }
}
