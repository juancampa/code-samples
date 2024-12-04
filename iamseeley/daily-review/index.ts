import { root, nodes, state } from "membrane";
import { format } from 'date-fns';


state.reviews = state.reviews ?? [];

const myName = 'Thomas';

export interface State {
  reviews: DailyReview[];
}

interface DailyReview {
  text: string;
  timestamp: number;
}

export async function listenSms() {
  await nodes.sms.received.$subscribe(root.saveSms);
  console.log("SMS subscription set up successfully");
}

export async function saveSms(_, { event}) {
  if (!(event.message as string).startsWith("Review:")) return;

  const text = event.message.replace("Review: ", "");
  const timestamp = Date.now();
  state.reviews.push({ text, timestamp });
}

export async function dailyReviewReminder() {
  await nodes.sms.send({ message: "Don't forget to write your daily review." });
}

export async function endpoint(req) {
  const sortedReviews = [...state.reviews].sort((a, b) => b.timestamp - a.timestamp);

  const groupedReviews = sortedReviews.reduce((acc, review) => {
    const date = format(new Date(review.timestamp), 'MMM, d');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(review);
    return acc;
  }, {} as Record<string, DailyReview[]>);

  const reviewsHtml = Object.entries(groupedReviews)
    .map(([date, reviews]) => {
      const reviewsList = (reviews as DailyReview[])
        .map(review => `<li>${review.text} <span class="review-time" data-timestamp="${review.timestamp}"></span></li>`)
        .join("");
      return `<h3 class="text-md text-neutral-400 italic">${date}</h3><ul>${reviewsList}</ul>`;
    })
    .join("");


    const body = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Reviews</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
      document.addEventListener("DOMContentLoaded", () => {
        const elements = document.querySelectorAll(".review-time");
        elements.forEach(el => {
          const timestamp = parseInt(el.getAttribute("data-timestamp"), 10);
          // Convert to local time without seconds
          const localTimeString = new Date(timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true // Change to false for 24-hour format
          });
          el.textContent = \`(\${localTimeString})\`;
        });
      });
    </script>
    </head>
    <body>
      <main class="max-w-2xl mx-auto p-4">
        <div class="flex flex-wrap gap-2 items-center mb-4">
          <h2 class="text-2xl font-semibold ">Daily Reviews </h2><p class="text-md pl-2 text-neutral-400 italic">~ ${myName}</p>
        </div>
        <aside class="border-l-4 bg-neutral-200 border-neutral-400 mb-6">
          <div class="pl-2 py-2 flex flex-col gap-1">
          <p>What did you do today?</p>
          </div>
        </aside>
        <div class="flex flex-col gap-4">
          <div>
          ${reviewsHtml}
          </div>
        </div>
      </main>
    </body>
  </html>`;


  const headers = { "Content-Type": "text/html" };
  
  return JSON.stringify({ headers, body });
}

export async function removeReview(index) {
  state.reviews.splice(index, 1);
}