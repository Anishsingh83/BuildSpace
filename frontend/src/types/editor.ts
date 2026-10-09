export interface EditorFile {
  path: string
  content: string
}

export function languageFor(path: string): string {
  if (path.endsWith('.html')) return 'html'
  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.md')) return 'markdown'
  return 'plaintext'
}

export const starterFiles: EditorFile[] = [
  {
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Project</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello, BuildSpace!</h1>
    <button id="btn">Click me</button>
    <script src="script.js"></script>
  </body>
</html>
`,
  },
  {
    path: 'styles.css',
    content: `body {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}
`,
  },
  {
    path: 'script.js',
    content: `document.getElementById('btn').addEventListener('click', () => {
  alert('It works!');
});
`,
  },
]
