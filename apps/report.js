import plugin from '../../../lib/plugins/plugin.js'
import Collector from '../model/collector.js'
import LLM from '../model/llm.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

export class GroupReport extends plugin {
  constructor () {
    super({
      name: '群报表',
      dsc: '生成群聊分析报表',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#群报表$',
          fnc: 'generateReport'
        },
        {
            reg: '.*',
            fnc: 'recordMessage',
            log: false
        }
      ]
    })
  }

  async recordMessage (e) {
      // Record message asynchronously
      Collector.save(e).catch(err => {
          logger.error('[GroupReport] Save failed', err)
      })
      // Return false to allow other plugins to handle the message
      return false
  }

  async generateReport (e) {
      if (!e.group_id) {
          e.reply('请在群聊中使用此命令')
          return true
      }

      // 1. Get History
      const history = Collector.getHistory(e.group_id)
      if (!history || history.length < 10) {
          e.reply('群聊记录不足，无法生成报表（需至少10条记录）。')
          return true
      }

      e.reply('正在生成群日报，请稍候... (分析最近聊天记录)')

      // 2. Local Statistics
      const stats = this.calculateStats(history)

      // 3. LLM Analysis
      let llmResult = {}
      try {
        llmResult = await LLM.analyze(history)
      } catch (err) {
        logger.error('[GroupReport] LLM Error', err)
        llmResult = {
            summary: '智能分析失败',
            hot_topics: [],
            active_users_analysis: [],
            sentiment: 'Unknown',
            suggestion: ''
        }
      }

      // 4. Render
      const data = {
          ...stats,
          ...llmResult,
          group_name: e.group_name || '本群',
          date: new Date().toLocaleDateString(),
          generated_time: new Date().toLocaleString()
      }

      // Yunzai Puppeteer Screenshot
      // Logic: plugin-name/html-file-name
      // This maps to plugins/K2GroupReport-Plugin/resources/html/report.html
      // We assume the plugin folder name is K2GroupReport-Plugin as per instructions.

      try {
          const img = await puppeteer.screenshot('K2GroupReport-Plugin/report', data)
          await e.reply(img)
      } catch (err) {
          logger.error('[GroupReport] Render Error', err)
          e.reply('报表生成失败，请检查日志。')
      }

      return true
  }

  calculateStats(history) {
      let hours = new Array(24).fill(0)
      let userMsgCount = {}
      let emojiCount = 0
      let imageCount = 0
      let totalChars = 0

      history.forEach(msg => {
          const date = new Date(msg.time)
          const hour = date.getHours()
          if (hour >= 0 && hour < 24) {
              hours[hour]++
          }

          if (!userMsgCount[msg.user_id]) {
              userMsgCount[msg.user_id] = { count: 0, nickname: msg.nickname }
          }
          userMsgCount[msg.user_id].count++

          if (msg.hasEmoji) emojiCount++
          if (msg.hasImage) imageCount++
          totalChars += msg.content.length
      })

      // Top active users (simple count)
      const sortedUsers = Object.values(userMsgCount).sort((a, b) => b.count - a.count).slice(0, 5)

      return {
          heatmap: hours, // Array [0..23]
          activeUsersCount: Object.keys(userMsgCount).length,
          emojiCount,
          imageCount,
          totalChars,
          msgCount: history.length,
          topUsers: sortedUsers
      }
  }
}
