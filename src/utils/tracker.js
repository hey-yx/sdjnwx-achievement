export function parseUA(ua) {
  const s = String(ua || '')
  const isIOS = /iPhone|iPad|iPod/.test(s)
  const isAndroid = /Android/.test(s)
  const isWinPhone = /Windows Phone|IEMobile/.test(s)
  const isMobile = /Mobile|Mobi|Opera Mini|IEMobile/.test(s)

  let device = 'desktop'
  if (isWinPhone || isAndroid || isIOS) {
    device = /iPad|Tablet/.test(s) ? 'tablet' : 'mobile'
  } else if (isMobile) {
    device = 'mobile'
  }

  let os = '其他'
  if (isWinPhone) os = 'Windows Phone'
  else if (/Windows/.test(s)) os = 'Windows'
  else if (isAndroid) os = 'Android'
  else if (isIOS) os = 'iOS'
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS'
  else if (/Linux/.test(s)) os = 'Linux'

  let browser = '其他'
  if (/MicroMessenger/i.test(s)) browser = '微信'
  else if (/Edg\//.test(s)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera'
  else if (/Firefox\//.test(s)) browser = 'Firefox'
  else if (/Chrome\//.test(s)) browser = 'Chrome'
  else if (/Safari\//.test(s)) browser = 'Safari'
  else if (/MSIE|Trident/.test(s)) browser = 'IE'

  return { device, os, browser }
}

export function reportVisit(page) {
  try {
    const ua = navigator.userAgent
    const { device, os, browser } = parseUA(ua)
    const payload = JSON.stringify({
      page: String(page || location.pathname + location.search).slice(0, 300),
      device,
      os,
      browser,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      lang: String(navigator.language || '').slice(0, 16),
      network: String(navigator.connection?.effectiveType || '').slice(0, 16),
      timezone: String(Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 64),
      ua: String(ua).slice(0, 500),
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      })
    }
  } catch (_) {}
}
