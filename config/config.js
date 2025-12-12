import fs from 'fs'
import path from 'path'

const ConfigDir = './data/K2GroupReport'
const ConfigFile = path.join(ConfigDir, 'config.json')

const DefaultConfig = {
    llm: {
        endpoint: process.env.LLM_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKey: process.env.LLM_API_KEY || '',
        model: process.env.LLM_MODEL || 'gemini-1.5-flash'
    },
    collector: {
        maxHistory: 2000
    }
}

class Config {
    constructor() {
        this.config = { ...DefaultConfig }
        this.load()
    }

    load() {
        if (fs.existsSync(ConfigFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(ConfigFile, 'utf8'))
                if (data.llm) this.config.llm = { ...this.config.llm, ...data.llm }
                if (data.collector) this.config.collector = { ...this.config.collector, ...data.collector }
            } catch (err) {
                console.error('[K2GroupReport] Error loading config:', err)
            }
        } else {
            this.save()
        }
    }

    save() {
        if (!fs.existsSync(ConfigDir)) {
            fs.mkdirSync(ConfigDir, { recursive: true })
        }
        fs.writeFileSync(ConfigFile, JSON.stringify(this.config, null, 2))
    }

    get llm() { return this.config.llm }
    get collector() { return this.config.collector }

    merge(data) {
        if (data.llm) {
            this.config.llm = { ...this.config.llm, ...data.llm }
        }
        if (data.collector) {
            this.config.collector = { ...this.config.collector, ...data.collector }
        }
        this.save()
    }
}

export default new Config()
