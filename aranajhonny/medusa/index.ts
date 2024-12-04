// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state } from "membrane";
import { Octokit } from "@octokit/rest";
import * as VectorCalc from 'vectorcalc';
import { $$ } from "@membrane/membrane-sdk-js";
import base64 from "base-64";
import utf8 from "utf8";
import SparkMD5 from 'spark-md5';
import parse from 'parse-link-header';
import querystring from 'querystring';
import { URL } from 'url';

export async function run() {
  const octokit = new Octokit({
    auth: "",
  });
  const { data } = await octokit.rest.users.getByUsername({
    username: "aranajhonny",
  });
  const scoreToNormalize = 0.75;
  const normalizedScore = VectorCalc.normalize(scoreToNormalize);
  const t1 = $$("a:b");
  const ref = t1.push("c", { x: 1, y: $$("a:b") }).toString();
  let encoded = 'bWVtYnJhbmU=';
  let bytes = base64.decode(encoded);
  const hash = SparkMD5.hash('message');
  const parsedLinkHeader = parse('<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=5>; rel="last"');
  const parsedQueryString = querystring.parse('foo=bar&baz=qux');
  const urlInstance = new URL('https://example.com');
}

