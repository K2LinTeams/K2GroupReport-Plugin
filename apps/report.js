import plugin from '../../../lib/plugins/plugin.js'
import Collector from '../model/collector.js'
import Analyzer from '../model/analyzer.js'
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
      Collector.save(e).catch(err => {
          logger.error('[GroupReport] Save failed', err)
      })
      return false
  }

  async generateReport (e) {
      if (!e.group_id) {
          e.reply('请在群聊中使用此命令')
          return true
      }

      const history = Collector.getHistory(e.group_id)
      if (!history || history.length < 10) {
          e.reply('群聊记录不足，无法生成报表（需至少10条记录）。')
          return true
      }

      e.reply('正在生成群日报，请稍候... (分析最近聊天记录)')

      // 1. Analyzer
      const stats = Analyzer.analyze(history)

      // 2. LLM Analysis
      let llmResult = {}
      try {
        llmResult = await LLM.analyze(history)
      } catch (err) {
        logger.error('[GroupReport] LLM Error', err)
        llmResult = LLM.getMockData()
      }

      // 3. Prepare Data for View
      // Chart data needs to be JSON strings for injection into <script> tags
      const chartData = {
          heatmap: JSON.stringify(stats.heatmap),
          wordcloud: JSON.stringify(stats.wordcloud),
          social: JSON.stringify(stats.social),
          sentimentCurve: JSON.stringify(stats.sentimentCurve)
      }

      const data = {
          ...chartData,
          gamification: stats.gamification, // Keep as Object for HTML loops
          stats: stats.stats,               // Keep as Object for HTML access

          ...llmResult, // Keep as Objects

          group_name: e.group_name || '本群',
          date: new Date().toLocaleDateString(),
          generated_time: new Date().toLocaleString()
      }

      try {
          const img = await puppeteer.screenshot('K2GroupReport-Plugin/report', data)
          await e.reply(img)
      } catch (err) {
          logger.error('[GroupReport] Render Error', err)
          e.reply('报表生成失败，请检查日志。')
      }

      return true
  }
}
