import { nodes, root, state } from "membrane";

state.news ??= [];

export async function configure({ keywords, notionPageId }) {
  state.keywords = keywords;
  // gref for the Notion page
  state.page = nodes.pages.one({ id: notionPageId });
  // Schedule news watching every hour
  root.watchNews.$cron("0 0 * * * *");
}

export async function watchNews() {
  // Fetch top stories from the API
  const topStories = await nodes.stories.items.$query(`{ title url }`);
  // keywords are comma separated
  const keywordArray = state.keywords
    .split(",")
    .map((keyword) => keyword.toLowerCase());
  // Filter top stories based on the provided keywords
  const matchedStories = topStories.filter((story) => {
    const title = story.title!.toLowerCase();
    return keywordArray.some((keyword) => title.includes(keyword));
  });

  const items = matchedStories.map((item) => {
    // If news is already in the state, don't add it again
    if (state.news.some((news) => news.url === item.url)) {
      console.log(`Skipping ${item.title}`);
      return;
    }

    console.log(`Adding ${item.title}`);
    state.news.push(item);
    return renderStory({ url: item.url, title: item.title });
  });

  if (!items.length) {
    console.log("No news found");
    return;
  }

  const blocks = {
    children: items,
  };
  // Append the blocks to the Notion page
  await state.page.appendBlock({
    children: blocks,
  });
}

// Helper function to convert a story to a block
function renderStory({ url, title }) {
  return {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [
        {
          type: "text",
          text: {
            content: title,
            link: {
              type: "url",
              url,
            },
          },
        },
      ],
      color: "default",
    },
  };
}
