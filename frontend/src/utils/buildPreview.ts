import type { EditorFile } from '../types/editor'

// Content-Security-Policy for the preview document. Sandboxed project code cannot make network
// requests (fetch, XHR, WebSocket), submit forms or open frames. Images, fonts, styles and scripts
// from a few public CDNs still load. Edit this one constant to loosen or tighten the policy.
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "font-src data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  'img-src data: blob: https:',
  'media-src data: blob:',
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ')

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`

// Injected into the preview. Forwards console output and errors to the parent window.
const BRIDGE = `<script>
(function () {
  function send(level, args) {
    var text = args.map(function (a) {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (e) { return String(a); }
    }).join(' ');
    parent.postMessage({ source: 'buildspace-preview', level: level, text: text }, '*');
  }
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      send(level, args);
      original.apply(console, args);
    };
  });
  window.alert = function (msg) { send('info', ['alert: ' + msg]); };
  window.addEventListener('error', function (e) {
    send('error', [e.message + ' (line ' + e.lineno + ')']);
  });
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['Unhandled promise rejection: ' + e.reason]);
  });
})();
</script>`

// The policy must come first: a meta CSP only affects content that follows it.
const PREAMBLE = CSP_META + BRIDGE

function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

export function buildSrcDoc(files: EditorFile[]): string {
  const byPath = new Map(files.map((f) => [f.path, f.content]))
  const index = byPath.get('index.html')

  if (index === undefined) {
    return '<p style="font-family:sans-serif;padding:1rem">Add an index.html file to see a preview.</p>'
  }

  let html = index

  html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href: string) => {
    const css = byPath.get(href)
    return css !== undefined && /stylesheet/i.test(tag) ? `<style>\n${css}\n</style>` : tag
  })

  html = html.replace(
    /<script([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (tag, _before: string, src: string) => {
      const js = byPath.get(src)
      return js !== undefined ? `<script>\n${escapeScript(js)}\n</script>` : tag
    },
  )

  // "<head>" or "<head ...>", but not "<header>".
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => match + PREAMBLE)
  }
  return PREAMBLE + html
}
