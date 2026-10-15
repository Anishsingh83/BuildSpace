# Preview sandbox: security notes

Project code is written by users, so it is untrusted. It runs only inside the preview iframe.

## Configuration

    <iframe sandbox="allow-scripts" srcdoc="...">

- `allow-scripts` lets the project's JavaScript run. Without it, projects would be static pages.
- `allow-same-origin` is deliberately NOT set. The code runs in an opaque origin, so it cannot read
  BuildSpace cookies, localStorage, or the in-memory access token, and it cannot call our API as the user.
- Not granted: top navigation, popups, forms, modals, downloads, pointer lock, camera/microphone.
- The page talks to the app only through `postMessage`. The app accepts messages only from its own iframe
  window and truncates them to 2000 characters.

## Known trade-offs

- Sandboxed code can still make outbound network requests and load external images, scripts and fonts.
  A viewer's IP address is therefore visible to hosts a project chooses to contact.
  Planned mitigation: a Content-Security-Policy on the preview document.
- A project can use CPU in the viewer's browser (for example an infinite loop) and freeze that tab.
  The tab is the only thing affected; BuildSpace servers never run user code.
- `alert()` is replaced by a console message, because modals are blocked in the sandbox.
- The preview is built in the browser from stored files. The backend never executes project code.

## Update: forms

The sandbox is now `allow-scripts allow-forms`. Without `allow-forms`, browsers do not run a form's
`submit` handler, which broke ordinary projects (the To-do and Landing templates). Actual form
submissions are still blocked by `form-action 'none'` in the preview document's CSP, so a form
cannot send data anywhere. `allow-same-origin`, popups, top navigation and modals remain off.
