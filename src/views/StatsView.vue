<template>
  <div class="stats">
    <div class="stats-head">
      <h2 class="stats-title">访问统计</h2>
      <div class="stats-tools">
        <span class="s-filter-label">日期</span>
        <input v-model="filterFrom" type="date" class="s-input" @change="reload(1)" />
        <span class="s-filter-label">至</span>
        <input v-model="filterTo" type="date" class="s-input" @change="reload(1)" />
        <select v-model="filterPage" class="s-input" @change="reload(1)">
          <option value="">全部页面</option>
          <option v-for="(p, i) in pageOptions" :key="i" :value="p">{{ p }}</option>
        </select>
        <button class="s-reset" @click="resetFilter">重置</button>
        <button class="stats-export" :disabled="exporting" @click="onExport">
          {{ exporting ? '导出中…' : '导出 CSV' }}
        </button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <span class="stat-num">{{ fmt(summary.totalPv) }}</span>
        <span class="stat-label">总访问量</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ fmt(summary.totalUv) }}</span>
        <span class="stat-label">独立访客</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ fmt(summary.todayPv) }}</span>
        <span class="stat-label">今日访问</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ fmt(summary.pageCount) }}</span>
        <span class="stat-label">页面数</span>
      </div>
    </div>

    <div class="stats-rankings">
      <div class="stats-panel">
        <div class="stats-panel-head">
          <h3 class="stats-panel-title">每页访问 Top</h3>
        </div>
        <div class="stats-panel-body">
          <table class="s-table">
            <thead>
              <tr><th>页面</th><th>访问次数</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in topPages" :key="i">
                <td class="s-page-cell">{{ p.page }}</td>
                <td class="s-count-cell">{{ fmt(p.count) }}</td>
              </tr>
              <tr v-if="!topPages.length"><td colspan="2" class="s-empty">暂无数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="stats-panel">
        <div class="stats-panel-head">
          <h3 class="stats-panel-title">IP 访问数排行</h3>
        </div>
        <div class="stats-panel-body">
          <table class="s-table">
            <thead>
              <tr><th>IP 地址</th><th>访问次数</th></tr>
            </thead>
            <tbody>
              <tr v-for="ip in topIps" :key="ip.ip">
                <td class="s-ip-cell">{{ ip.ip }}</td>
                <td class="s-count-cell">{{ fmt(ip.count) }}</td>
              </tr>
              <tr v-if="!topIps.length"><td colspan="2" class="s-empty">暂无数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="stats-panel">
      <div class="stats-panel-head">
        <h3 class="stats-panel-title">访问明细</h3>
      </div>
      <div class="stats-panel-body">
        <div v-if="loading" class="s-loading">加载中…</div>
        <template v-else>
          <table class="s-table">
            <thead>
              <tr>
                <th>时间</th><th>IP</th><th>设备</th><th>系统</th><th>浏览器</th><th>页面</th><th>屏幕</th><th>视口</th><th>语言</th><th>网络</th><th>时区</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, i) in list" :key="i">
                <td class="s-time">{{ fmtTime(v.time) }}</td>
                <td>{{ v.ip }}</td>
                <td>{{ v.device }}</td>
                <td>{{ v.os }}</td>
                <td>{{ v.browser }}</td>
                <td class="s-page-cell">{{ v.page }}</td>
                <td>{{ v.screen }}</td>
                <td>{{ v.viewport || '-' }}</td>
                <td>{{ v.lang || '-' }}</td>
                <td>{{ v.network || '-' }}</td>
                <td>{{ v.timezone || '-' }}</td>
              </tr>
              <tr v-if="!list.length"><td colspan="11" class="s-empty">暂无数据</td></tr>
            </tbody>
          </table>
          <div class="s-pager">
            <button class="s-page-btn" :disabled="pageNo <= 1" @click="reload(pageNo - 1)">上一页</button>
            <span class="s-page-info">第 {{ pageNo }} / {{ totalPages }} 页，共 {{ fmt(total) }} 条</span>
            <button class="s-page-btn" :disabled="pageNo >= totalPages" @click="reload(pageNo + 1)">下一页</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const token = () => localStorage.getItem('stats_token') || ''

const summary = ref({ totalPv: 0, totalUv: 0, todayPv: 0, pageCount: 0 })
const topPages = ref([])
const topIps = ref([])
const pages = ref([])
const list = ref([])
const total = ref(0)
const pageNo = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const loading = ref(false)
const exporting = ref(false)

const filterPage = ref('')
const filterFrom = ref('')
const filterTo = ref('')

const pageOptions = computed(() => pages.value)

const fmt = (n) => Number(n || 0).toLocaleString()
const STATS_TZ = 'Asia/Shanghai'
const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: STATS_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const get = (t) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
  } catch (_) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
}

async function fetchStats() {
  loading.value = true
  try {
    const q = new URLSearchParams({ pageNo: String(pageNo.value) })
    if (filterPage.value) q.set('page', filterPage.value)
    if (filterFrom.value) q.set('from', filterFrom.value)
    if (filterTo.value) q.set('to', filterTo.value)
    const r = await fetch(`/api/stats?${q}`, { headers: { Authorization: `Bearer ${token()}` } })
    if (r.status === 401) {
      localStorage.removeItem('stats_token')
      router.replace('/login')
      return
    }
    if (!r.ok) throw new Error('bad status')
    const data = await r.json()
    summary.value = data.summary
    topPages.value = data.topPages
    topIps.value = data.topIps || []
    pages.value = data.pages || []
    list.value = data.list
    total.value = data.total
  } catch (_) {
    alert('加载失败，请确认后端服务已启动')
  } finally {
    loading.value = false
  }
}

function reload(p) {
  pageNo.value = p
  fetchStats()
}

function resetFilter() {
  filterPage.value = ''
  filterFrom.value = ''
  filterTo.value = ''
  reload(1)
}

async function onExport() {
  exporting.value = true
  try {
    const q = new URLSearchParams()
    if (filterPage.value) q.set('page', filterPage.value)
    if (filterFrom.value) q.set('from', filterFrom.value)
    if (filterTo.value) q.set('to', filterTo.value)
    const r = await fetch(`/api/export?${q}`, { headers: { Authorization: `Bearer ${token()}` } })
    if (r.status === 401) {
      localStorage.removeItem('stats_token')
      router.replace('/login')
      return
    }
    if (!r.ok) throw new Error('bad status')
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `访问统计_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (_) {
    alert('导出失败，请稍后再试')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  if (!token()) {
    router.replace('/login')
    return
  }
  fetchStats()
})
</script>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stats-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: var(--primary);
  color: #fff;
}
.stats-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 3px;
  position: relative;
  padding-bottom: 8px;
}
.stats-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 36px;
  height: 3px;
  background: var(--accent);
}
.stats-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stats-export {
  padding: 8px 20px;
  font-size: 15px;
  color: #fff;
  background: var(--accent-dark, #b8860b);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 2px;
  transition: opacity 0.2s;
}
.stats-export:hover { opacity: 0.85; }
.stats-export:disabled { opacity: 0.6; cursor: not-allowed; }

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.stat-card {
  background: #fff;
  border: 1px solid var(--border);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-num {
  font-family: var(--font-title);
  font-size: 32px;
  font-weight: 800;
  color: var(--primary);
}
.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.stats-rankings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.stats-panel {
  background: #fff;
  border: 1px solid var(--border);
}
.stats-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 18px;
  height: 60px;
  background: var(--primary);
  color: #fff;
}
.stats-panel-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  position: relative;
  padding-bottom: 8px;
}
.stats-panel-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 36px;
  height: 3px;
  background: var(--accent);
}
.stats-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.s-input {
  height: 34px;
  padding: 0 10px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  background: #fff;
  color: var(--text);
  outline: none;
}
.s-input:focus { border-color: var(--accent); }
.s-filter-label {
  font-size: 14px;
  color: #fff;
  letter-spacing: 1px;
}
.s-reset {
  height: 34px;
  padding: 0 14px;
  font-size: 14px;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.s-reset:hover { border-color: var(--accent); color: var(--accent); }

.stats-panel-body {
  padding: 16px 18px;
}
.s-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.s-table th,
.s-table td {
  padding: 9px 10px;
  border: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
.s-table th {
  background: var(--bg-soft);
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}
.s-table td {
  color: var(--text-secondary);
  word-break: break-all;
}
.s-time { white-space: nowrap; }
.s-page-cell { max-width: 320px; }
.s-ip-cell { max-width: 240px; }
.s-count-cell { font-weight: 700; color: var(--primary); }
.s-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px 0 !important;
}
.s-loading {
  padding: 32px 0;
  text-align: center;
  color: var(--text-muted);
}
.s-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 14px;
}
.s-page-btn {
  padding: 6px 16px;
  font-size: 14px;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.s-page-btn:hover { opacity: 0.85; }
.s-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.s-page-info { font-size: 14px; color: var(--text-muted); }
@media (max-width: 760px) {
  .stats-rankings { grid-template-columns: minmax(0, 1fr); }
}
</style>
