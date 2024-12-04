import { nodes, root, state } from "membrane";
import { getSVG } from "qreator/lib/svg";

export async function genSVG({ text }) {
  const svg = await getSVG(text);
  const string = new TextDecoder().decode(svg);
  return string.replace(/<\?xml.*\?>/g, "");
}

export async function endpoint({ path, body }) {
  switch (path) {
    case "/qr": {
      let { name, password } = parseQS(body);
      const text = `WIFI:T:WPA;P:${password};S:${name};H:false;`;

      const qr = await root.genSVG({ text });
      const string = qr.replace(/\\/g, "").replace(/\"/g, "'");
      return html(`<section>${string}</section>`);
    }
    case "/": {
      return html(`
        <section>
          <h2>WIFI QR Generator</h2>
          <form action="/qr" method="POST">
            <table>
            <tbody>
            <tr>
              <td>
                <label for="name">Red:
              </td>
              <td>
                <input type="text" id="name" name="name" />
              </td>
            </tr>
            <tr>
              <td>
                <label for="password">Password:</label>
              </td>
              <td>
                <input type="password" id="password" name="password" />
              </td>
            <tr>
            </tbody>
            </table>
            <div style="display: flex; flex-direction: row; justify-content: center; margin-top: 10px;">
              <input type="submit" value="Submit" style="margin-top: 10px;" />
            </div>
          </form>
        </section>
      `);
    }
  }
}

function html(body: string) {
  return `
    <!DOCTYPE html>
    <head>
      <style>
      </style>
      <meta charset="utf-8" />
      <title>Form</title>
      <link rel="stylesheet" href="https://www.membrane.io/light.css"></script>
    </head>
    <body>
      <div style="position: absolute; inset: 0px; display: flex; flex-direction: row; justify-content: center; align-items: center;">
        <div style="display: flex; flex-direction: column; align-items: center; width: 300px;">
          ${body}
        </div>
      </div>
    </body>
  `;
}

const parseQS = (qs: string): Record<string, string> =>
  Object.fromEntries((new URLSearchParams(qs) as any).entries());
