/**
 * `nodes` contain any nodes you add from the graph (connections).
 * `state` is an object is durable across program updates.
 */
import { nodes, state } from "membrane";

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
export async function endpoint(req) {
  switch (req.path) {
    case "/":
      const query = new URLSearchParams(req.query ?? "");
      return home(query.get("message"));
    case "/contact":
      if (req.method === "POST") {
        const body = new URLSearchParams(req.body);
        state.contact.first = body.get("first") ?? state.contact.first;
        state.contact.last = body.get("last") ?? state.contact.last;
        state.contact.email = body.get("email") ?? state.contact.email;

        // Redirect to home page with a message
        const msg = encodeURIComponent("Hello " + state.contact.first);
        return JSON.stringify({
          status: 302,
          headers: {
            Location: `/?message=${msg}`,
          },
        });
      }
  }
  return JSON.stringify({ status: 404 });
}

// Renders the entire page
function home(message: string | null) {
  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8">
      <title>Membrane HTML Demo</title>
      ${style()}
    </head>
    <body>
      <main class="container">
        <section>
          ${message ? `<p>${message}</p>` : ""}
          ${formFragment()}
        </section>
        <section>
          The above form is rendered server-side.
          <p>
          The contact data is stored in the Membrane <a href="https://docs.membrane.io/reference/membrane-module/#state">state object</a>.
          <p>
          Related: <a href="https://membrane.io/share/membrane/htmx">HTMX example</a> that doesn't refresh the entire page.
        </section>
        <footer>
          This is a demo of rendering simple HTML in a <a href="https://membrane.io">Membrane</a> program.
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

// Renders the contact form
function formFragment() {
  return /*html*/ `
    <form action="/contact" method="POST">
      <div>
        <label>First Name</label>
        <input type="text" name="first" value="${state.contact.first}">
      </div>
      <div>
        <label>Last Name</label>
        <input type="text" name="last" value="${state.contact.last}">
      </div>
      <div>
        <label>Email</label>
        <input type="email" name="email" value="${state.contact.email}">
      </div>
      <button class="btn">Submit</button>
    </form>
  `;
}
