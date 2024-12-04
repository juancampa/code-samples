import { nodes } from "membrane";
import { RAG } from "./rag";

interface FileContent {
  content: string;
  path: string;
}

interface DirectoryItem {
  name?: string;
  type?: string;
}

export async function processDriverExamples(rag: RAG) {
  console.log("Fetching driver examples...");
  const owner = "iamseeley";
  const repo = "mem-knowledge";
  const basePath = "driver_examples/testing";

  try {
    const directories = await listDirectories(owner, repo, basePath);
    for (const dir of directories) {
      await processDriverDirectory(owner, repo, `${basePath}/${dir}`, rag);
    }
  } catch (error) {
    console.error("Error fetching driver examples:", error);
  }
}

async function listDirectories(owner: string, repo: string, path: string): Promise<string[]> {
  const dirContent = await nodes.github.users
    .one({ name: owner })
    .repos.one({ name: repo })
    .content.dir({ path })
    .$query(`{ name type }`);

  return (dirContent as DirectoryItem[])
    .filter((item): item is Required<DirectoryItem> => item.type === "dir" && item.name !== undefined)
    .map(item => item.name);
}

async function processDriverDirectory(owner: string, repo: string, path: string, rag: RAG) {
  const files = await listFiles(owner, repo, path);
  const fileContents: Record<string, FileContent> = {};

  for (const file of files) {
    const content = await fetchFileContent(owner, repo, `${path}/${file}`);
    fileContents[file] = { content, path: `${path}/${file}` };
  }

  const codeFiles = ['index.ts', 'index.js', 'util.ts', 'util.js'].filter(file => fileContents[file]);
  const schemaFile = fileContents['memconfig.json'];
  const readmeFile = fileContents['README.md'];

  if (schemaFile) {
    await indexSchema(rag, schemaFile, codeFiles.map(file => fileContents[file]));
  }

  for (const codeFile of codeFiles) {
    await indexCode(rag, fileContents[codeFile], schemaFile);
  }

  if (readmeFile) {
    await indexReadme(rag, readmeFile);
  }
}

async function listFiles(owner: string, repo: string, path: string): Promise<string[]> {
  const dirContent = await nodes.github.users
    .one({ name: owner })
    .repos.one({ name: repo })
    .content.dir({ path })
    .$query(`{ name type }`);

  return (dirContent as DirectoryItem[])
    .filter((item): item is Required<DirectoryItem> => item.type === "file" && item.name !== undefined)
    .map(item => item.name);
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  const fileContent = await nodes.github.users
    .one({ name: owner })
    .repos.one({ name: repo })
    .content.file({ path })
    .$query(`{ content }`);

  if (typeof fileContent.content !== 'string') {
    throw new Error(`Unable to fetch content for file: ${path}`);
  }

  return Buffer.from(fileContent.content, 'base64').toString('utf-8');
}

async function indexSchema(rag: RAG, schemaFile: FileContent, relatedCodeFiles: FileContent[]) {
  const relatedContent = relatedCodeFiles.map(file => file.content).join('\n\n');
  await rag.addToIndex("schema_examples", schemaFile.path, {
    title: `Schema: ${schemaFile.path.split('/').pop()}`,
    content: schemaFile.content,
    relatedContent
  });
}

async function indexCode(rag: RAG, codeFile: FileContent, schemaFile?: FileContent) {
  await rag.addToIndex("driver_code", codeFile.path, {
    title: `Code: ${codeFile.path.split('/').pop()}`,
    content: codeFile.content,
    relatedContent: schemaFile ? schemaFile.content : undefined
  });
}

async function indexReadme(rag: RAG, readmeFile: FileContent) {
  await rag.addToIndex("driver_docs", readmeFile.path, {
    title: extractTitleFromMarkdown(readmeFile.content) || "Driver Documentation",
    content: readmeFile.content
  });
}

function extractTitleFromMarkdown(content: string): string | null {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}