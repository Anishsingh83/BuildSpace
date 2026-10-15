import { describe, expect, it } from 'vitest'
import { buildTree, isUnder, remapPath, validateNewPath, validateRename } from './paths'

const files = ['index.html', 'css/a.css']

describe('validateNewPath', () => {
  it('accepts simple and nested paths', () => {
    expect(validateNewPath('about.html', files, [])).toBeUndefined()
    expect(validateNewPath('assets/img/logo.svg', files, [])).toBeUndefined()
  })

  it.each(['', '../x', 'a//b', '.hidden', '/abs', 'a b.txt', 'back\\slash', 'trailing/', 'x'.repeat(65)])(
    'rejects %j',
    (bad) => {
      expect(validateNewPath(bad, files, [])).toBeTypeOf('string')
    },
  )

  it('limits nesting depth', () => {
    expect(validateNewPath('a/b/c/d/e.txt', files, [])).toBeUndefined()
    expect(validateNewPath('a/b/c/d/e/f.txt', files, [])).toMatch(/nested at most 4/)
  })

  it('rejects duplicates, including a name that matches a folder', () => {
    expect(validateNewPath('index.html', files, [])).toMatch(/already exists/)
    expect(validateNewPath('css', files, [])).toMatch(/already exists/)
    expect(validateNewPath('empty', files, ['empty'])).toMatch(/already exists/)
  })

  it('does not let a file act as a folder', () => {
    expect(validateNewPath('index.html/x.txt', files, [])).toMatch(/is a file/)
  })
})

describe('validateRename', () => {
  it('requires a different name', () => {
    expect(validateRename('index.html', 'index.html', false, files, [])).toBe('Enter a different name.')
  })

  it('allows a normal rename and a folder rename', () => {
    expect(validateRename('index.html', 'home.html', false, files, [])).toBeUndefined()
    expect(validateRename('css', 'styles', true, files, [])).toBeUndefined()
  })

  it('refuses to overwrite an existing file', () => {
    expect(validateRename('css/a.css', 'index.html', false, files, [])).toMatch(/already exists/)
  })

  it('refuses to move a folder into itself', () => {
    expect(validateRename('css', 'css/sub', true, files, [])).toBe('A folder cannot be moved into itself.')
  })
})

describe('isUnder and remapPath', () => {
  it('matches whole path segments only', () => {
    expect(isUnder('css/a.css', 'css')).toBe(true)
    expect(isUnder('css', 'css')).toBe(true)
    expect(isUnder('cssx/a.css', 'css')).toBe(false)
  })

  it('moves paths under a renamed folder and leaves others alone', () => {
    expect(remapPath('css/a.css', 'css', 'styles')).toBe('styles/a.css')
    expect(remapPath('css', 'css', 'styles')).toBe('styles')
    expect(remapPath('cssx/a.css', 'css', 'styles')).toBe('cssx/a.css')
  })
})

describe('buildTree', () => {
  it('puts folders first and sorts by name', () => {
    const tree = buildTree(['index.html', 'css/b.css', 'css/a.css'], ['empty'])
    expect(tree.map((n) => n.name)).toEqual(['css', 'empty', 'index.html'])
    expect(tree[0].isFolder).toBe(true)
    expect(tree[0].children.map((c) => c.path)).toEqual(['css/a.css', 'css/b.css'])
    expect(tree[1].children).toEqual([])
  })

  it('builds nested folders from file paths', () => {
    const tree = buildTree(['a/b/c.txt'], [])
    expect(tree[0].name).toBe('a')
    expect(tree[0].children[0].name).toBe('b')
    expect(tree[0].children[0].children[0].path).toBe('a/b/c.txt')
  })
})
