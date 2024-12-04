/**
 * `playground` is a dogfooding program for experiments and such.
 */
import { nodes, state } from "membrane";
import { Hono } from 'hono';
import { format } from 'date-fns';

state.app ??= new Hono()
export interface State {
    app: any;
}

export async function play() {
    // Print Hono app 🎉
    console.log(state.app);

    // Get Repository from connection
    const docs = nodes.membraneDocs;
    const { title: prTitle } = await docs.pull_requests.one({ number: 40 }).$query("{ title }");
    console.log(prTitle);

    // "date-fns" npm package works 🎉
    const date = format(new Date(), "EEE, MMM d yyyy, h:mm:ss a");
    console.log(date);
}
