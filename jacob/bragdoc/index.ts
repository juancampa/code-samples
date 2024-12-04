// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state } from "membrane";

export async function getAllMessages(){
  let all: Array<Object> = []
  let items = await nodes.channel.messages.page().items.$query(" { user text } ")
  let next = await nodes.channel.messages.page().next

  all = all.concat(items)
  for (let i = 0; i < 10; i++){


    try{
      const nextres = await next.$query(" { items { user text } } ")
    items = nextres.items as slack.values.Message[]

    next = await next.next;
    all = all.concat(items)

    } catch(e){
      const message = e
      if (String(message).includes("cannot read property \'ts\' of undefined")){
        break
      }
      else{
        throw(e)
      }
    }
    
  }
  return all;
  // "U07FRG5463S"
}

export async function run() {
  const messages = await getAllMessages();

  
  const brags = await nodes.one.completeChat({messages: [{role:"user",content:
  `Extract and organize all of the bugs that U07FRG5463S reported
  ${JSON.stringify(messages)}`}]})
  console.log(brags)
  
}

// Handles the program's HTTP endpoint
export async function endpoint(args) {
  return `Path: ${args.path}`;
}
