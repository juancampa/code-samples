// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state } from "membrane";
// const htmlparser2 = require('htmlparser2');

//https://lu.ma/nyc-tech/

const parseEvents = (inputString) => {
  // Regex pattern to match event objects
const pattern = /\{"@type":"Event".*?\}/gs;

// Find all matches
const matches = inputString.match(pattern) || [];

// Parse each match into a JSON object
const events: Array<Object> = [];
matches.forEach((match) => {
  try {
    const event = JSON.parse(match) ;
    events.push(event);
  } catch (error) {
    console.error(`Failed to parse event: ${match}...`);  // Print first 100 chars of failed match
  }
});



// Print the extracted events
events.forEach((event, index) => {
  console.log(`Event ${index + 1}:`);
  console.log(JSON.stringify(event, null, 2));
  console.log("\n");
});

console.log(`Total events extracted: ${events.length}`);
}

function filterEvents(data, rangeStart: Date, rangeEnd: Date) {
  // Convert range to timestamps for easier comparison
  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = rangeEnd.getTime();

  // Filter events whose start date falls between rangeStart and rangeEnd
  return data.events.filter(event => {
    const eventStartTime = new Date(event.startDate).getTime();
    return eventStartTime >= rangeStartTime && eventStartTime <= rangeEndTime;
  });
}

function formatEvent(event: Event): string {
  const eventName = event.name;
  const locationName = event.location.name;
  const eventUrl = event['@id']; // Get the URL from the @id property

  // Extract the date part from the startDate (which is in ISO format)
  const isoDate = event.startDate.split('T')[0]; // Extracts 'YYYY-MM-DD'
  const [year, month, day] = isoDate.split('-'); // Split into parts

  // Create an array of month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Convert month (0-based index) to a month name
  const monthName = monthNames[parseInt(month, 10) - 1]; // Convert to 0-based index

  const formattedDate = `${monthName} ${parseInt(day, 10)}`; // Example: "October 1"

  // Format the event name as a link
  const eventLink = `[${eventName}](${eventUrl})`; // Create the link

  return `${eventLink} will be hosted at ${locationName} on ${formattedDate}.`;
}




export async function run({url}) {
  // console.log(url)
  
  const page = await nodes.http.get({url}).body;
  // const $ = cheerio.load('<ul id="fruits">...</ul>');

  const scriptContent = page.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (scriptContent){
    const data = JSON.parse(scriptContent)
    // Get current time
    const now = new Date();

    // Calculate 24 hours from now
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Calculate 5 to 6 days from now
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

    // Get events happening within the next 24 hours
    const eventsInNext24Hours = filterEvents(data, now, next24Hours);
    console.log("Events in the next 24 hours:", eventsInNext24Hours,eventsInNext24Hours.map((event) => formatEvent(event)));
    console.log("done")

    // Get events happening between 5 and 6 days from now
    const eventsIn5to6Days = filterEvents(data, fiveDaysFromNow, sixDaysFromNow);
    console.log("Events in 5 to 6 days:", eventsIn5to6Days);
    console.log("done")

    // console.log(data)
  }
  else{
    nodes.sms.send({message:"Failed to scrape Luma discord for Fractal tech events"})
  }
  // console.log(scriptContent)


  // console.log($.html());
  // console.log(page)
  // extractJsonLdFromHtml(page)
  // console.log(page);
}

// (res) => {
//   let data = '';

//   // Collect data from the response
//   res.on('data', (chunk) => {
//       data += chunk;
//   });

//   // When the response ends, parse the data
//   res.on('end', () => {
//       // Use JSDOM to parse the HTML response
//       const dom = new JSDOM(data);
//       const document = dom.window.document;

//       // Example: Extract the title of the page
//       const title = document.querySelector('title')?.textContent;
//       console.log('Page Title:', title);

//       // Example: Extract all paragraphs
//       const paragraphs = document.querySelectorAll('p');
//       paragraphs.forEach((para) => {
//           console.log('Paragraph:', para.textContent);
//       });
//   });
// }

const  extractJsonLdFromHtml = (htmlString: string):any => {
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i;
  const match = htmlString.match(jsonLdRegex);

  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      console.error('Failed to parse JSON-LD:', error);
      return null;
    }
  }

  console.error('No JSON-LD script tag found in the HTML');
  return null;
}

// Handles the program's HTTP endpoint
export async function endpoint(args) {
  return `Path: ${args.path}`;
}
