<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-head">
        <h3 class="login-title">访问统计后台</h3>
      </div>
      <form class="login-body" @submit.prevent="onSubmit">
        <label class="login-label" for="pwd">管理密码</label>
        <input
          id="pwd"
          v-model="password"
          type="password"
          class="login-input"
          placeholder="请输入管理密码"
          autocomplete="current-password"
          @keyup.enter="onSubmit"
        />
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
        <p class="login-hint">登录后进入访问统计页面</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      error.value = data.error || '登录失败'
      return
    }
    localStorage.setItem('stats_token', data.token)
    router.replace('/stats')
  } catch (_) {
    error.value = '网络错误，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 300px);
  padding: 40px 16px;
}
.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid var(--border);
}
.login-head {
  padding: 14px 18px;
  height: 60px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
}
.login-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 3px;
  position: relative;
  padding-bottom: 8px;
}
.login-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 36px;
  height: 3px;
  background: var(--accent);
}
.login-body {
  padding: 28px 32px 24px;
  display: flex;
  flex-direction: column;
}
.login-label {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.login-input {
  height: 44px;
  padding: 0 14px;
  font-size: 15px;
  border: 1px solid var(--border);
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
}
.login-input:focus {
  border-color: var(--accent);
}
.login-error {
  margin-top: 10px;
  font-size: 14px;
  color: #c0392b;
}
.login-btn {
  margin-top: 16px;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
  color: #fff;
  background: var(--accent-dark, #b8860b);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.login-btn:hover {
  opacity: 0.85;
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
