import { nodes } from "membrane";

export async function endpoint(req) {
  switch (req.method) {
    case "GET":
      return JSON.stringify({
        status: 200,
        headers: { "Content-Type": "text/html" },
        body: await getFormHtml(),
      });
    case "POST":
      const params = new URLSearchParams(req.body);
      const email = params.get("email");
      const feedback = params.get("feedback");

      const subject = `Feedback on getting-started tutorial from ${email}`;
      await nodes.email.send({ subject, body: `${feedback}` });

      return JSON.stringify({
        status: 200,
        headers: { "Content-Type": "text/html" },
        body: await getFeedbackSuccessPage(),
      });
    default:
      return { status: 405, body: "Method not allowed" };
  }
}

async function getFormHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en" style="${HTML_STYLES}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Membrane Getting Started Feedback</title>
    </head>
      <body style="${BODY_STYLES}">
        <main>
          <form method="POST" action=${await nodes.process.endpointUrl()} style="${FORM_STYLES}">
            <label for="email" style="${VISUALLY_HIDDEN}">Email</label>
            <input type="email" id="email" name="email" placeholder="grace@hopper.co" required style="${INPUT_STYLES}" />
            <label for="feedback" style="${VISUALLY_HIDDEN}">Feedback</label>
            <textarea id="feedback" name="feedback" placeholder="Your feedback..." required rows="8" style="${INPUT_STYLES}"></textarea>
            <button style="${BUTTON_STYLES}">Submit</button>
          </form>
        </main>
      </body>
    </html>
  `;
}

async function getFeedbackSuccessPage() {
  return `
    <!DOCTYPE html>
    <html lang="en" style="${HTML_STYLES}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Membrane Getting Started Feedback</title>
    </head>
      <body style="${BODY_STYLES}">
        <main style="${FORM_STYLES}">
          <h1 style="${HEADING_STYLES}">Thanks for your feedback!</h1>
        </main>
      </body>
    </html>
  `;
}
const HTML_STYLES = `
  box-sizing: border-box;
  height: 100vh;
`;

const HEADING_STYLES = `
  font-size: 1rem;
  text-align: center;
  text-wrap: balance;
`;

const BODY_STYLES = `
  height: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: MonoRegular, Inconsolata, Consolas, Monaco, monospace;
  background:
    radial-gradient(#d4c9c9 1px, transparent 1px),
    radial-gradient(#d4c9c9 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
`;

const FORM_STYLES = `
  width: 300px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #f4f4f4;
  border: 1px solid #999;
  box-shadow: 4px 4px 0px 0px #000;
`;

const INPUT_STYLES = `
  padding: 4px;
  resize: vertical;
  border-top: 2px solid #000;
  border-left: 2px solid #000;
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ddd;
  font-family: MonoRegular, Inconsolata, Consolas, Monaco, monospace;
`;

const BUTTON_STYLES = `
  width: 50%;
  margin: 0 auto;
  padding: 8px;
  background-color: #fff;
  border: 1px solid #000;
  box-shadow: 4px 4px 0px 0px #000;
  text-transform: uppercase;
  font-family: MonoRegular, Inconsolata, Consolas, Monaco, monospace;
  font-weight: bold;
  cursor: pointer;
`;

const VISUALLY_HIDDEN = `
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;
