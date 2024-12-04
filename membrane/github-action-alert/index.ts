/**
 * Minimal example program that handles GitHub webhooks for workflow jobs and sends an sms if a job failed.
 */
import { nodes } from "membrane";

export async function endpoint({ path, body }) {
  switch (path) {
    case "/webhook":
      {
        const { action, workflow_job, repository } = JSON.parse(body);
        if (action === "completed" && workflow_job.conclusion === "failure") {
          const message = `The ${workflow_job.workflow_name} workflow in the ${repository.full_name} repository was cancelled due to a failure caused by ${workflow_job.name}.`;
          await nodes.sms.send({ message });
        }
      }
      return JSON.stringify({ status: 200 });
    default:
      console.log("Unknown Endpoint:", path);
  }
}
