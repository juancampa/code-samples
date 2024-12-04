/**
 * One-off program to archive all submodule repos in the legacy directory: https://github.com/membrane-io/directory
 * There's nowhere in github.com to archive multiple repos at once, but you can do it via the API.
 */

import { nodes } from "membrane";

export async function run() {
  const org = nodes.github.organizations.one({ name: "membrane-io" });
  const directory = org.repos.one({ name: "directory" });
  const submodules = await directory.content.dir.$query("{ name }");

  for (const sub of submodules) {
    const submodule = directory.content.file({ path: sub.name });
    const { type, submodule_git_url } = await submodule.$query(
      "{ type submodule_git_url }",
    );

    if (type === "submodule" && submodule_git_url) {
      const name = submodule_git_url.split("/").pop()?.replace(".git", "");
      if (!name) throw new Error("Missing repo name");

      const repo = org.repos.one({ name });
      await repo.archive();
    }
  }
}
