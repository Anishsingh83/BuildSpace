const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/
const MAX_DEPTH = 5
const MAX_PATH_LENGTH = 200

export interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  children: TreeNode[]
}

export function isUnder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + '/')
}

export function remapPath(path: string, from: string, to: string): string {
  if (path === from) return to
  if (path.startsWith(from + '/')) return to + path.slice(from.length)
  return path
}

function validateSyntax(path: string): string | undefined {
  if (!path) return 'A name is required.'
  if (path.length > MAX_PATH_LENGTH) return 'That path is too long.'
  const segments = path.split('/')
  if (segments.length > MAX_DEPTH) {
    return `Folders can be nested at most ${MAX_DEPTH - 1} levels deep.`
  }
  if (!segments.every((s) => SEGMENT.test(s))) {
    return 'Names may use letters, numbers, dots, hyphens and underscores, and cannot start with a dot.'
  }
}

function collectFolders(filePaths: string[], emptyFolders: string[]): Set<string> {
  const folders = new Set<string>()
  const add = (path: string, includeSelf: boolean) => {
    const parts = path.split('/')
    const end = includeSelf ? parts.length : parts.length - 1
    for (let i = 1; i <= end; i++) folders.add(parts.slice(0, i).join('/'))
  }
  filePaths.forEach((p) => add(p, false))
  emptyFolders.forEach((p) => add(p, true))
  return folders
}

export function validateNewPath(
  path: string,
  filePaths: string[],
  emptyFolders: string[],
): string | undefined {
  const syntax = validateSyntax(path)
  if (syntax) return syntax

  if (filePaths.includes(path) || collectFolders(filePaths, emptyFolders).has(path)) {
    return `"${path}" already exists.`
  }
  const parts = path.split('/')
  for (let i = 1; i < parts.length; i++) {
    const ancestor = parts.slice(0, i).join('/')
    if (filePaths.includes(ancestor)) {
      return `"${ancestor}" is a file, so it cannot contain other items.`
    }
  }
}

export function validateRename(
  oldPath: string,
  newPath: string,
  isFolder: boolean,
  filePaths: string[],
  emptyFolders: string[],
): string | undefined {
  if (newPath === oldPath) return 'Enter a different name.'
  if (isFolder && newPath.startsWith(oldPath + '/')) {
    return 'A folder cannot be moved into itself.'
  }
  const otherFiles = filePaths.filter((p) => !isUnder(p, oldPath))
  const otherFolders = emptyFolders.filter((p) => !isUnder(p, oldPath))
  return validateNewPath(newPath, otherFiles, otherFolders)
}

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) =>
    a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1,
  )
  nodes.forEach((n) => sortNodes(n.children))
}

export function buildTree(filePaths: string[], emptyFolders: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] }

  function ensureFolder(parts: string[]): TreeNode {
    let node = root
    parts.forEach((name, i) => {
      const path = parts.slice(0, i + 1).join('/')
      let child = node.children.find((c) => c.isFolder && c.path === path)
      if (!child) {
        child = { name, path, isFolder: true, children: [] }
        node.children.push(child)
      }
      node = child
    })
    return node
  }

  emptyFolders.forEach((f) => ensureFolder(f.split('/')))
  filePaths.forEach((p) => {
    const parts = p.split('/')
    ensureFolder(parts.slice(0, -1)).children.push({
      name: parts[parts.length - 1],
      path: p,
      isFolder: false,
      children: [],
    })
  })

  sortNodes(root.children)
  return root.children
}
