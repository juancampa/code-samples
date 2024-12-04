import { nodes } from "membrane";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ListFruits } from "./components";

export const Root = {
  status: async () => {
    return `[Open](${await nodes.process.endpointUrl})`;
  },
};

export async function endpoint({ method, path }) {
  switch (path) {
    case "/":
      if (method === "GET") {
        const fruits = ["Apple", "Banana", "Cherry", "Durian", "Elderberry"];
        const body = renderToString(createElement(ListFruits, { fruits }));
        
        return `<!DOCTYPE html>
          <head>
            <meta charset="utf-8" />
            <title>Membrane React.js SSR</title>
          </head>
          <body>
            ${body}
          </body>
        </html>`;
      }
      break;
    default:
      return JSON.stringify({ status: 404 });
  }
}
