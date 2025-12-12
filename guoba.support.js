import Config from './config/config.js'

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'K2GroupReport',
      title: '群聊报表',
      author: '@Jules',
      authorLink: 'https://github.com/Jules',
      link: 'https://github.com/Jules/K2GroupReport-Plugin',
      isV3: true,
      isCar: false,
      description: '生成群聊分析报表，包含词云、社交网络、情感分析等'
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: 'LLM 设置'
        },
        {
          field: 'llm.endpoint',
          label: 'API 地址',
          bottomHelpMessage: 'OpenAI 兼容接口地址',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: 'https://api.openai.com/v1/chat/completions'
          }
        },
        {
          field: 'llm.apiKey',
          label: 'API Key',
          bottomHelpMessage: 'LLM API 密钥',
          component: 'Input',
          required: true,
          componentProps: {
            type: 'password',
            placeholder: 'sk-...'
          }
        },
        {
          field: 'llm.model',
          label: '模型名称',
          bottomHelpMessage: '例如 gemini-flash-latest, gpt-4o',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: 'gemini-flash-latest'
          }
        },
        {
          component: 'Divider',
          label: '数据收集设置'
        },
        {
          field: 'collector.maxHistory',
          label: '历史记录数',
          bottomHelpMessage: '保留最近多少条消息用于分析',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 100,
            max: 10000
          }
        }
      ],
      getConfigData() {
        return {
            llm: Config.llm,
            collector: Config.collector
        }
      },
      setConfigData(data, { Result }) {
        Config.merge(data)
        return Result.ok({}, '保存成功')
      }
    }
  }
}
