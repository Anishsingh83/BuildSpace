"""Starter templates. Each is a small, self-contained HTML/CSS/JS project."""

TEMPLATE_INFO: list[dict[str, str]] = [
    {"id": "blank", "name": "Blank", "description": "A minimal HTML, CSS and JavaScript starter."},
    {"id": "portfolio", "name": "Personal portfolio", "description": "About, projects and contact sections."},
    {"id": "landing", "name": "Landing page", "description": "Hero, features and a sign-up form."},
    {"id": "product-card", "name": "Product card", "description": "A product card with a favourite and cart button."},
    {"id": "calculator", "name": "Calculator", "description": "A working four-function calculator."},
    {"id": "todo", "name": "To-do app", "description": "Add, complete and delete tasks."},
    {"id": "dashboard", "name": "Responsive dashboard", "description": "Stat cards and a bar chart that adapt to screen size."},
]

TEMPLATE_IDS: set[str] = {t["id"] for t in TEMPLATE_INFO}

_PORTFOLIO_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Portfolio</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <h1>Your Name</h1>
      <p>Web developer and designer</p>
    </header>
    <main>
      <section>
        <h2>About</h2>
        <p>Write a short introduction about yourself and what you enjoy building.</p>
      </section>
      <section>
        <h2>Projects</h2>
        <div class="grid">
          <article><h3>Project one</h3><p>A short description of what it does.</p></article>
          <article><h3>Project two</h3><p>A short description of what it does.</p></article>
          <article><h3>Project three</h3><p>A short description of what it does.</p></article>
        </div>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Email: <a href="#">you@example.com</a></p>
      </section>
    </main>
    <footer>&copy; <span id="year"></span> Your Name</footer>
    <script src="script.js"></script>
  </body>
</html>
"""

_PORTFOLIO_CSS = """* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #1e293b; line-height: 1.6; }
header { background: #4f46e5; color: white; padding: 3rem 1.5rem; text-align: center; }
header h1 { margin: 0; font-size: 2.2rem; }
main { max-width: 860px; margin: 0 auto; padding: 1.5rem; }
h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
article { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
article h3 { margin-top: 0; }
a { color: #4f46e5; }
footer { text-align: center; padding: 1.5rem; color: #64748b; }
"""

_PORTFOLIO_JS = """document.getElementById('year').textContent = new Date().getFullYear();
"""

_LANDING_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Landing Page</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <section class="hero">
      <h1>Build something people love</h1>
      <p>One clear sentence that explains what your product does.</p>
      <form id="signup">
        <input id="email" type="email" placeholder="you@example.com" required />
        <button type="submit">Get early access</button>
      </form>
      <p id="message" aria-live="polite"></p>
    </section>
    <section class="features">
      <div><h3>Fast</h3><p>Explain the first benefit here.</p></div>
      <div><h3>Simple</h3><p>Explain the second benefit here.</p></div>
      <div><h3>Reliable</h3><p>Explain the third benefit here.</p></div>
    </section>
    <script src="script.js"></script>
  </body>
</html>
"""

_LANDING_CSS = """* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #0f172a; }
.hero { text-align: center; padding: 4rem 1.5rem; background: linear-gradient(135deg, #e0e7ff, #fce7f3); }
.hero h1 { font-size: clamp(1.8rem, 5vw, 3rem); margin: 0 0 0.5rem; }
form { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
input { padding: 0.7rem 1rem; border: 1px solid #cbd5e1; border-radius: 8px; min-width: 240px; }
button { padding: 0.7rem 1.2rem; border: 0; border-radius: 8px; background: #4f46e5; color: white; cursor: pointer; }
button:hover { background: #4338ca; }
.features { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }
.features div { text-align: center; }
"""

_LANDING_JS = """const form = document.getElementById('signup');
const message = document.getElementById('message');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  message.textContent = 'Thanks! We will write to ' + email + '.';
  form.reset();
});
"""

_CARD_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Product Card</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <article class="card">
      <div class="image" aria-hidden="true">&#127911;</div>
      <button id="fav" class="fav" aria-label="Favourite" aria-pressed="false">&#9825;</button>
      <h2>Wireless Headphones</h2>
      <p class="muted">Noise cancelling, 30 hour battery.</p>
      <div class="row">
        <strong>$89.00</strong>
        <button id="add">Add to cart</button>
      </div>
      <p id="cart" class="muted">Cart: 0 items</p>
    </article>
    <script src="script.js"></script>
  </body>
</html>
"""

_CARD_CSS = """* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f1f5f9; font-family: system-ui, sans-serif; }
.card { position: relative; width: 300px; background: white; border-radius: 16px; padding: 1.2rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
.image { height: 160px; display: grid; place-items: center; font-size: 4rem; background: #e0e7ff; border-radius: 12px; }
.fav { position: absolute; top: 1.6rem; right: 1.6rem; border: 0; background: white; border-radius: 50%; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; }
.fav.on { color: #e11d48; }
h2 { margin: 1rem 0 0.2rem; font-size: 1.2rem; }
.muted { color: #64748b; margin: 0.2rem 0; font-size: 0.9rem; }
.row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.8rem; }
#add { padding: 0.5rem 0.9rem; border: 0; border-radius: 8px; background: #4f46e5; color: white; cursor: pointer; }
"""

_CARD_JS = """const fav = document.getElementById('fav');
const cart = document.getElementById('cart');
let count = 0;

fav.addEventListener('click', () => {
  const on = fav.classList.toggle('on');
  fav.textContent = on ? '\\u2665' : '\\u2661';
  fav.setAttribute('aria-pressed', String(on));
});

document.getElementById('add').addEventListener('click', () => {
  count += 1;
  cart.textContent = 'Cart: ' + count + (count === 1 ? ' item' : ' items');
});
"""

_CALC_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calculator</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="calc">
      <div id="display" class="display">0</div>
      <div class="keys">
        <button data-key="C" class="fn">C</button>
        <button data-key="/" class="op">&divide;</button>
        <button data-key="*" class="op">&times;</button>
        <button data-key="-" class="op">&minus;</button>
        <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
        <button data-key="+" class="op">+</button>
        <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
        <button data-key="=" class="eq">=</button>
        <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
        <button data-key="0" class="zero">0</button>
        <button data-key=".">.</button>
      </div>
    </div>
    <script src="script.js"></script>
  </body>
</html>
"""

_CALC_CSS = """* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; font-family: system-ui, sans-serif; }
.calc { width: 290px; background: #1e293b; border-radius: 16px; padding: 1rem; }
.display { background: #0f172a; color: white; text-align: right; font-size: 2rem; padding: 1rem; border-radius: 10px; margin-bottom: 0.8rem; overflow: hidden; }
.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
button { padding: 0.9rem 0; font-size: 1.1rem; border: 0; border-radius: 10px; background: #334155; color: white; cursor: pointer; }
button:hover { filter: brightness(1.2); }
.op { background: #4f46e5; }
.fn { background: #be123c; }
.eq { background: #059669; grid-row: span 2; }
.zero { grid-column: span 2; }
"""

_CALC_JS = """const display = document.getElementById('display');
let current = '0';
let previous = null;
let operator = null;
let fresh = true;

function compute(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return b === 0 ? NaN : a / b;
  return b;
}

function format(n) {
  return Number.isFinite(n) ? String(Math.round(n * 1e10) / 1e10) : 'Error';
}

function press(key) {
  if (current === 'Error' && key !== 'C') return;
  if (key === 'C') {
    current = '0'; previous = null; operator = null; fresh = true;
  } else if (key >= '0' && key <= '9') {
    current = fresh ? key : (current.length < 12 ? current + key : current);
    fresh = false;
  } else if (key === '.') {
    if (fresh) { current = '0.'; fresh = false; }
    else if (!current.includes('.')) current += '.';
  } else if (key === '=') {
    if (operator !== null) {
      current = format(compute(previous, parseFloat(current), operator));
      operator = null; fresh = true;
    }
  } else {
    if (operator !== null && !fresh) {
      current = format(compute(previous, parseFloat(current), operator));
    }
    previous = parseFloat(current);
    operator = key;
    fresh = true;
  }
  display.textContent = current;
}

document.querySelectorAll('button[data-key]').forEach((button) => {
  button.addEventListener('click', () => press(button.dataset.key));
});
"""

_TODO_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>To-do</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="app">
      <h1>My tasks</h1>
      <form id="form">
        <input id="input" placeholder="What needs doing?" maxlength="100" required />
        <button type="submit">Add</button>
      </form>
      <ul id="list"></ul>
      <p id="status" class="muted"></p>
    </main>
    <script src="script.js"></script>
  </body>
</html>
"""

_TODO_CSS = """* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: start center; padding: 3rem 1rem; background: #f8fafc; font-family: system-ui, sans-serif; }
.app { width: 100%; max-width: 440px; background: white; border-radius: 14px; padding: 1.5rem; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1); }
h1 { margin-top: 0; }
form { display: flex; gap: 0.5rem; }
input { flex: 1; padding: 0.6rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; }
button { padding: 0.6rem 1rem; border: 0; border-radius: 8px; background: #4f46e5; color: white; cursor: pointer; }
ul { list-style: none; padding: 0; margin: 1rem 0 0; }
li { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0; border-bottom: 1px solid #e2e8f0; }
li span { flex: 1; word-break: break-word; }
li.done span { text-decoration: line-through; color: #94a3b8; }
li button { background: transparent; color: #be123c; padding: 0.2rem 0.5rem; }
.muted { color: #64748b; font-size: 0.9rem; }
"""

_TODO_JS = """const form = document.getElementById('form');
const input = document.getElementById('input');
const list = document.getElementById('list');
const status = document.getElementById('status');
let tasks = [];
let nextId = 1;

function render() {
  list.textContent = '';
  tasks.forEach((task) => {
    const item = document.createElement('li');
    if (task.done) item.className = 'done';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = task.done;
    box.addEventListener('change', () => { task.done = box.checked; render(); });

    const text = document.createElement('span');
    text.textContent = task.text;

    const remove = document.createElement('button');
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      render();
    });

    item.append(box, text, remove);
    list.append(item);
  });
  const left = tasks.filter((t) => !t.done).length;
  status.textContent = tasks.length === 0 ? 'No tasks yet.' : left + ' of ' + tasks.length + ' left';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: nextId++, text: text, done: false });
  input.value = '';
  render();
});

render();
"""

_DASH_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="layout">
      <nav class="side">
        <h2>Acme</h2>
        <a href="#">Overview</a>
        <a href="#">Reports</a>
        <a href="#">Settings</a>
      </nav>
      <main>
        <div class="top">
          <h1>Overview</h1>
          <button id="refresh">Refresh data</button>
        </div>
        <section class="stats">
          <div class="stat"><span>Revenue</span><strong id="s1">$0</strong></div>
          <div class="stat"><span>Orders</span><strong id="s2">0</strong></div>
          <div class="stat"><span>Visitors</span><strong id="s3">0</strong></div>
        </section>
        <section class="panel">
          <h2>Sales this week</h2>
          <div id="chart" class="chart"></div>
        </section>
      </main>
    </div>
    <script src="script.js"></script>
  </body>
</html>
"""

_DASH_CSS = """* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f1f5f9; color: #0f172a; }
.layout { display: grid; grid-template-columns: 200px 1fr; min-height: 100vh; }
.side { background: #1e293b; color: white; padding: 1.2rem; display: flex; flex-direction: column; gap: 0.6rem; }
.side a { color: #cbd5e1; text-decoration: none; padding: 0.4rem 0.6rem; border-radius: 6px; }
.side a:hover { background: #334155; }
main { padding: 1.5rem; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.top h1 { margin: 0; }
button { padding: 0.5rem 0.9rem; border: 0; border-radius: 8px; background: #4f46e5; color: white; cursor: pointer; }
.stats { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin: 1.2rem 0; }
.stat { background: white; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
.stat span { color: #64748b; font-size: 0.9rem; }
.stat strong { font-size: 1.6rem; }
.panel { background: white; border-radius: 12px; padding: 1rem; }
.chart { display: flex; align-items: flex-end; gap: 0.6rem; height: 180px; }
.bar { flex: 1; background: #6366f1; border-radius: 6px 6px 0 0; display: flex; justify-content: center; font-size: 0.75rem; color: white; padding-top: 0.2rem; transition: height 0.3s; }
@media (max-width: 640px) {
  .layout { grid-template-columns: 1fr; }
  .side { flex-direction: row; flex-wrap: wrap; align-items: center; }
}
"""

_DASH_JS = """const chart = document.getElementById('chart');
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function update() {
  const values = days.map(() => rand(20, 100));
  chart.textContent = '';
  values.forEach((value, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = value + '%';
    bar.textContent = days[i];
    chart.append(bar);
  });
  document.getElementById('s1').textContent = '$' + rand(8000, 20000).toLocaleString();
  document.getElementById('s2').textContent = rand(120, 480).toLocaleString();
  document.getElementById('s3').textContent = rand(2000, 9000).toLocaleString();
}

document.getElementById('refresh').addEventListener('click', update);
update();
"""

# "blank" is not listed here: it uses BLANK_FILES from the projects service.
TEMPLATE_FILES: dict[str, list[tuple[str, str]]] = {
    "portfolio": [("index.html", _PORTFOLIO_HTML), ("script.js", _PORTFOLIO_JS), ("styles.css", _PORTFOLIO_CSS)],
    "landing": [("index.html", _LANDING_HTML), ("script.js", _LANDING_JS), ("styles.css", _LANDING_CSS)],
    "product-card": [("index.html", _CARD_HTML), ("script.js", _CARD_JS), ("styles.css", _CARD_CSS)],
    "calculator": [("index.html", _CALC_HTML), ("script.js", _CALC_JS), ("styles.css", _CALC_CSS)],
    "todo": [("index.html", _TODO_HTML), ("script.js", _TODO_JS), ("styles.css", _TODO_CSS)],
    "dashboard": [("index.html", _DASH_HTML), ("script.js", _DASH_JS), ("styles.css", _DASH_CSS)],
}
