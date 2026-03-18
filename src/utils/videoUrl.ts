/**
 * Convert video URL to same-origin when on deployed frontend.
 * Proxying through Vercel avoids cross-origin issues that break:
 * - Safari: video thumbnails and canvas screenshot capture
 * - Firefox: canvas screenshot capture (in some CORS/config cases)
 *
 * On localhost we use the Railway URL directly (no proxy available).
 */
export function getVideoUrl(railwayUrl: string, safariThumbnail = false): string {
  if (typeof window === 'undefined') return railwayUrl

  // On localhost, no proxy - use Railway URL directly
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return safariThumbnail ? appendMediaFragment(railwayUrl) : railwayUrl
  }

  // Extract key from Railway video-proxy URL
  try {
    const url = new URL(railwayUrl)
    if (url.pathname.includes('/api/video-proxy') && url.searchParams.has('key')) {
      const key = url.searchParams.get('key')!
      const sameOrigin = `${window.location.origin}/api/video-proxy?key=${encodeURIComponent(key)}`
      return safariThumbnail ? appendMediaFragment(sameOrigin) : sameOrigin
    }
  } catch {
    // Invalid URL, return as-is
  }
  return safariThumbnail ? appendMediaFragment(railwayUrl) : railwayUrl
}

/** Append #t=0.001 for Safari to display first frame (Safari ignores preload for cross-origin) */
function appendMediaFragment(url: string): string {
  return url.includes('#') ? url : `${url}#t=0.001`
}
