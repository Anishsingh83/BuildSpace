import { describe, expect, it } from 'vitest'
import { buildSrcDoc } from './buildPreview'

const file = (path: string, content: string) => ({ path, content })

describe('buildSrcDoc', () => {
  it('explains when index.html is missing', () => {
    expect(buildSrcDoc([file('a.txt', 'x')])).toContain('Add an index.html')
  })

  it('inlines the linked stylesheet and script', () => {
    const doc = buildSrcDoc([
      file(
        'index.html',
        '<html><head><link rel="stylesheet" href="styles.css"></head><body><script src="script.js"></script></body></html>',
      ),
      file('styles.css', 'body{color:red}'),
      file('script.js', 'console.log(1)'),
    ])
    expect(doc).toContain('<style>')
    expect(doc).toContain('body{color:red}')
    expect(doc).not.toContain('href="styles.css"')
    expect(doc).toContain('console.log(1)')
    expect(doc).not.toContain('src="script.js"')
  })

  it('leaves external links and scripts alone', () => {
    const doc = buildSrcDoc([
      file(
        'index.html',
        '<head><link rel="stylesheet" href="https://cdn.example/x.css"></head><script src="https://cdn.example/x.js"></script>',
      ),
    ])
    expect(doc).toContain('href="https://cdn.example/x.css"')
    expect(doc).toContain('src="https://cdn.example/x.js"')
  })

  it('puts the policy and the console bridge before any project code', () => {
    const doc = buildSrcDoc([
      file('index.html', '<head><title>t</title></head><body><script src="script.js"></script></body>'),
      file('script.js', 'window.__user = 1'),
    ])
    const csp = doc.indexOf('Content-Security-Policy')
    const bridge = doc.indexOf('buildspace-preview')
    const user = doc.indexOf('window.__user')
    expect(doc.indexOf('<head>')).toBeLessThan(csp)
    expect(csp).toBeLessThan(bridge)
    expect(bridge).toBeLessThan(user)
  })

  it('blocks network requests, forms and frames from project code', () => {
    const doc = buildSrcDoc([file('index.html', '<head></head>')])
    expect(doc).toContain("connect-src 'none'")
    expect(doc).toContain("form-action 'none'")
    expect(doc).toContain("frame-src 'none'")
    expect(doc).toContain("object-src 'none'")
  })

  it('does not mistake <header> for <head>', () => {
    const doc = buildSrcDoc([
      file('index.html', "<header><h1>Hi</h1></header><script>console.log('works')</script>"),
    ])
    expect(doc.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true)
    expect(doc.indexOf('buildspace-preview')).toBeLessThan(doc.indexOf('<header>'))
  })

  it('accepts a <head> tag that has attributes', () => {
    const doc = buildSrcDoc([file('index.html', '<head lang="en"><title>t</title></head>')])
    expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(doc.indexOf('<title>'))
  })

  it('escapes a closing script tag inside project JavaScript', () => {
    const doc = buildSrcDoc([
      file('index.html', '<head></head><script src="script.js"></script>'),
      file('script.js', 'const s = "</script>";'),
    ])
    expect(doc).toContain('const s = "<\\/script>";')
  })
})
