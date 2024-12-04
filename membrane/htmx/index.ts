/**
 * `nodes` contain any nodes you add from the graph (connections).
 * `state` is an object is durable across program updates.
 */
import { state, nodes } from "membrane";

state.contact = state.contact ?? {
  first: "John",
  last: "Doe",
  email: "john@example.com",
};

export const Root = {
  status: async () => {
    const url = await nodes.process.endpointUrl;
    return `[Open](${url})`;
  },
};

/**
 * The endpoint action is invoked whenever the program's URL endpoint is accessed.
 * Right-click on the program in the Navigator (left sidebar) and select "Open Endpoint URL".
 * https://docs.membrane.io/features/endpoints/
 */
export async function endpoint(args) {
  switch (args.path) {
    case "/":
      return home();
    case "/contact":
      if (args.method === "PUT") {
        const body = new URLSearchParams(args.body);
        state.contact.first = body.get("first") ?? state.contact.first;
        state.contact.last = body.get("last") ?? state.contact.last;
        state.contact.email = body.get("email") ?? state.contact.email;
      }
      return contactFragment();
    case "/edit":
      return formFragment();
  }
  return JSON.stringify({ status: 404 });
}

// Renders the entire page
function home() {
  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8">
      <title>Membrane HTMX Demo</title>
      <script src="https://unpkg.com/htmx.org@1.9.4"></script>
      ${style()}
    </head>
    <body>
      <main class="container">
        <section>
        ${contactFragment()}
        </section>
        <section>
        The above form is rendered server-side but won't reload the page when editing or submitting.
        <p>
        The contact data is stored in the Membrane <a href="https://docs.membrane.io/reference/membrane-module/#state">state object</a>.
        </section>
        <footer>
        This is a demo of <a href="https://htmx.org">HTMX</a> and <a href="https://membrane.io">Membrane</a>.
        </footer>
      </main>
    </body>
  </html>
  `;
}

// Renders the style tag
function style() {
  return /*html*/ `
    <style>
      body {
        font-family: sans-serif;
        color: #333;
        
        line-height: 1.5;
      }
      main {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        flex-direction: column; 
        gap: 1rem;
      }
      section {
        border: 1px solid #ccc;
        padding: 3rem;
        width: 300px;
      }
      button {
        margin-top: 1rem;
      }
      footer {
        opacity: 0.8;
      }
    </style>
  `;
}

// Renders the contact data
function contactFragment() {
  return /*html*/ `
    <div hx-target="this" hx-swap="outerHTML">
      <div><label>First Name</label>: ${state.contact.first}</div>
      <div><label>Last Name</label>: ${state.contact.last}</div>
      <div><label>Email</label>: ${state.contact.email}</div>
      <button hx-get="/edit" class="btn btn-primary">
        Click To Edit
      </button>
    </div>
`;
}

// Renders the contact form
function formFragment() {
  return /*html*/ `
    <form hx-put="/contact" hx-target="this" hx-swap="outerHTML">
      <div>
        <label>First Name</label>
        <input type="text" name="first" value="${state.contact.first}">
      </div>
      <div class="form-group">
        <label>Last Name</label>
        <input type="text" name="last" value="${state.contact.last}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" value="${state.contact.email}">
      </div>
      <button class="btn">Submit</button>
      <button class="btn" hx-get="/contact">Cancel</button>
    </form>
  `;
}
