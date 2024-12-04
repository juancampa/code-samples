import { state, nodes } from "membrane";
import { fetchTasks, fetchUpvotes } from "./tasks";
import { getFeedbackForm, getFeedbackSuccessPage } from "./feedbackForm";

type TaskId = string;
type IpAddress = string;
export interface State {
  tasks: Record<TaskId, Record<IpAddress, boolean>>;
}

state.tasks ??= [];

// Used by docs.membrane.io/roadmap
export const endpoint: resolvers.Root["endpoint"] = async (req) => {
  const ipAddress = JSON.parse(req.headers)["x-forwarded-for"];

  switch (req.method) {
    case "GET": {
      const status = 200;
      const headers = { "Content-Type": "application/json" };

      // GET /
      if (req.path === "/") {
        const body = JSON.stringify(await fetchTasks());
        return JSON.stringify({ status, headers, body });
      }

      // GET /upvotes/:id
      if (req.path.includes("upvotes")) {
        const taskId = req.path.split("/").pop();
        const body = JSON.stringify(fetchUpvotes({ ipAddress, taskId }));
        return JSON.stringify({ status, headers, body });
      }

      // GET /feedback/:id
      if (req.path.includes("feedback")) {
        const taskId = req.path.split("/").pop();
        if (!taskId) return JSON.stringify({ status: 404 });

        const { name } = await nodes.tasks
          .one({ id: taskId })
          .$query(`{ id name }`);
        if (!name) return JSON.stringify({ status: 404 });

        const headers = { "Content-Type": "text/html" };
        const body = await getFeedbackForm({ taskId, taskName: name });
        return JSON.stringify({ status, headers, body });
      }
    }
    case "POST": {
      const status = 201;
      const taskId = req.path.split("/").pop();
      if (!taskId) return JSON.stringify({ status: 404 });

      // POST /upvote/:id
      if (req.path.includes("upvote")) {
        state.tasks[taskId][ipAddress] = true;
        return JSON.stringify({ status });
      }

      // POST /downvote/:id
      if (req.path.includes("downvote")) {
        delete state.tasks[taskId][ipAddress];
        return JSON.stringify({ status });
      }

      // POST /feedback/:id
      if (req.path.includes("feedback")) {
        const params = new URLSearchParams(req.body);
        const email = params.get("email") || "anonymous";
        const feedback = params.get("feedback");
        const { name } = await nodes.tasks
          .one({ id: taskId })
          .$query(`{ id name }`);

        const subject = `Feedback from ${email} on public roadmap task: ${name}`;
        await nodes.email.send({ subject, body: `${feedback}` });

        const headers = { "Content-Type": "text/html" };
        const body = await getFeedbackSuccessPage();
        return JSON.stringify({ status, headers, body });
      }
    }
    default:
      return JSON.stringify({ status: 404 });
  }
};
