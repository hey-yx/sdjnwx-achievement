import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'visits.json')
const ENV_FILE = path.join(__dirname, '.env')

function loadEnv() {
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch (_) {}
}
loadEnv()

if (!process.env.ADMIN_PASSWORD || !process.env.TOKEN_SECRET) {
  console.error('缺少配置：请在 server/.env 中设置 ADMIN_PASSWORD 和 TOKEN_SECRET')
  process.exit(1)
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const TOKEN_SECRET = process.env.TOKEN_SECRET
const TOKEN_TTL_MS = (Number(process.env.TOKEN_TTL_DAYS) || 15) * 24 * 60 * 60 * 1000

let visits = []

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    visits = Array.isArray(parsed) ? parsed : []
  } catch (_) {
    visits = []
  }
}

let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const tmp = DATA_FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(visits))
      fs.renameSync(tmp, DATA_FILE)
    } catch (e) {
      console.error('save visits failed', e)
    }
  }, 800)
}

load()

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

function signToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  if (sig !== expected) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof data.exp === 'number' && data.exp > Date.now()
  } catch (_) {
    return false
  }
}

const app = express()
app.use(express.json({ limit: '64kb' }))

app.post('/api/track', (req, res) => {
  const b = req.body || {}
  const now = new Date().toISOString()
  visits.push({
    time: now,
    ip: clientIp(req),
    page: String(b.page || '').slice(0, 300),
    device: String(b.device || '').slice(0, 32),
    os: String(b.os || '').slice(0, 64),
    browser: String(b.browser || '').slice(0, 64),
    screen: String(b.screen || '').slice(0, 32),
    viewport: String(b.viewport || '').slice(0, 32),
    lang: String(b.lang || '').slice(0, 16),
    network: String(b.network || '').slice(0, 16),
    timezone: String(b.timezone || '').slice(0, 64),
    ua: String(b.ua || '').slice(0, 500),
  })
  if (visits.length > 200000) {
    visits.splice(0, visits.length - 200000)
  }
  scheduleSave()
  res.status(204).end()
})

app.post('/api/login', (req, res) => {
  const b = req.body || {}
  if (b.password === ADMIN_PASSWORD) {
    res.json({ token: signToken(), expiresAt: Date.now() + TOKEN_TTL_MS })
  } else {
    res.status(401).json({ error: '密码错误' })
  }
})

function requireToken(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : String(req.query.token || '')
  if (verifyToken(token)) return next()
  res.status(401).json({ error: '未授权或登录已过期' })
}

function dayInTz(isoStr, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoStr))
}

function todayStr() {
  const tz = process.env.STATS_TZ || 'Asia/Shanghai'
  return dayInTz(new Date().toISOString(), tz)
}

app.get('/api/stats', requireToken, (req, res) => {
  const tz = process.env.STATS_TZ || 'Asia/Shanghai'
  const filterPage = String(req.query.page || '').slice(0, 300)
  const filterFrom = String(req.query.from || '').slice(0, 10)
  const filterTo = String(req.query.to || '').slice(0, 10)
  const pageNo = Math.max(1, parseInt(req.query.pageNo, 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

  const inDateRange = (v) => {
    const d = dayInTz(v.time, tz)
    if (filterFrom && d < filterFrom) return false
    if (filterTo && d > filterTo) return false
    return true
  }

  const dateScoped = visits.filter(inDateRange)
  const scoped = filterPage ? dateScoped.filter((v) => v.page === filterPage) : dateScoped

  const today = todayStr()
  const pageCountMap = new Map()
  const ipCountMap = new Map()
  let todayPv = 0
  const ipSet = new Set()

  for (const v of scoped) {
    const ip = v.ip || '未知 IP'
    ipSet.add(ip)
    pageCountMap.set(v.page, (pageCountMap.get(v.page) || 0) + 1)
    ipCountMap.set(ip, (ipCountMap.get(ip) || 0) + 1)
    if (dayInTz(v.time, tz) === today) todayPv++
  }

  const topPages = [...pageCountMap.entries()]
    .map(([page, count]) => ({ page: page || '/', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  const topIps = [...ipCountMap.entries()]
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const pageList = new Map()
  for (const v of dateScoped) {
    pageList.set(v.page, (pageList.get(v.page) || 0) + 1)
  }
  const pages = [...pageList.entries()]
    .map(([page, count]) => ({ page: page || '/', count }))
    .sort((a, b) => b.count - a.count)

  const total = scoped.length
  const list = [...scoped]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice((pageNo - 1) * pageSize, pageNo * pageSize)

  res.json({
    summary: {
      totalPv: scoped.length,
      totalUv: ipSet.size,
      todayPv,
      pageCount: pageCountMap.size,
    },
    topPages,
    topIps,
    pages: pages.map((p) => p.page),
    list,
    total,
    pageNo,
    pageSize,
  })
})

function fmtTzTime(isoStr, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(isoStr)).replace(',', '')
}

function csvField(v) {
  const s = String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

app.get('/api/export', requireToken, (req, res) => {
  const tz = process.env.STATS_TZ || 'Asia/Shanghai'
  const filterPage = String(req.query.page || '').slice(0, 300)
  const filterFrom = String(req.query.from || '').slice(0, 10)
  const filterTo = String(req.query.to || '').slice(0, 10)

  let rows = visits
  if (filterPage) rows = rows.filter((v) => v.page === filterPage)
  if (filterFrom) rows = rows.filter((v) => dayInTz(v.time, tz) >= filterFrom)
  if (filterTo) rows = rows.filter((v) => dayInTz(v.time, tz) <= filterTo)

  const header = ['时间', 'IP', '页面', '设备', '操作系统', '浏览器', '屏幕分辨率', '视口', '语言', '网络', '时区', 'UserAgent']
  const lines = [header.map(csvField).join(',')]
  const sorted = [...rows].sort((a, b) => (a.time < b.time ? 1 : -1))
  for (const v of sorted) {
    lines.push(
      [fmtTzTime(v.time, tz), v.ip, v.page, v.device, v.os, v.browser, v.screen, v.viewport, v.lang, v.network, v.timezone, v.ua].map(csvField).join(','),
    )
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="visits.csv"')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.send('\uFEFF' + lines.join('\r\n'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`visit-tracker listening on http://localhost:${PORT}`)
})
