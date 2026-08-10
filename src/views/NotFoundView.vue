<template>
  <PageLayout>
    <div class="nf">
      <div class="nf-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="#d0d0d0" stroke-width="2" fill="none"/>
          <line x1="28" y1="28" x2="52" y2="52" stroke="#d0d0d0" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="52" y1="28" x2="28" y2="52" stroke="#d0d0d0" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="nf-code">404</p>
      <p class="nf-msg">该页面不存在</p>
      <p class="nf-hint">请检查访问地址是否正确</p>
    </div>
  </PageLayout>
</template>

<script setup>
import PageLayout from '../components/PageLayout.vue'
</script>

<style scoped>
.nf {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 70vh; gap: 12px;
  background: #fafafa; border: 1px solid var(--border); flex: 1;
}
.nf-icon { opacity: 0.35; margin-bottom: 4px; }
.nf-code { font-size: 56px; font-weight: 700; color: var(--primary); opacity: 0.2; line-height: 1; }
.nf-msg { font-size: 16px; color: var(--text-muted); letter-spacing: 1px; }
.nf-hint { font-size: 13px; color: var(--text-muted); opacity: 0.6; }
</style>
