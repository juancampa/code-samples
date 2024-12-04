// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, root } from "membrane";

export async function configure() {
  // Create a form
  const form = await nodes.forms.create({
    title: "Job application",
    canResubmit: true,
  });

  // Create a form field for each question
  const values = Promise.allSettled([
    form.string({ key: "name", label: "Full Name", required: true }),
    form.checkbox({
      key: "confirm-info",
      label: "Confirm Information Accuracy",
    }),
    form.select({
      key: "shirt-color",
      label: "Preferred Shirt Color",
      required: true,
      options: JSON.stringify([
        { label: "Red", value: "red" },
        { label: "Green", value: "green" },
        { label: "Blue", value: "blue" },
      ]),
    }),
    form.radio({
      key: "gender",
      label: "Gender",
      required: true,
      options: JSON.stringify([
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
        { label: "Non-binary", value: "non-binary" },
      ]),
    }),
    form.date({ key: "birthdate", label: "Date of Birth" }),
    form.time({ key: "start-time", label: "Available Start Time" }),
    form.datetime({ key: "meeting-time", label: "Preferred Meeting Time" }),
    form.number({
      key: "age",
      label: "Age",
      required: true,
      min: String(18),
      max: String(99),
    }),
    form.range({
      key: "level-experience",
      label: "Level of Experience",
      min: String(0),
      max: String(20),
      step: 1,
    }),
    form.email({ key: "email", label: "Email Address", required: true }),
    form.password({
      key: "password",
      label: "Create a Password",
      required: true,
    }),
  ]);

  console.log("please visit: ", await form.url);
  // Subscribe to the form's submitted event
  form.submitted.$subscribe(root.handler);
}

export async function handler(_, { event }) {
  // TODO: Manage the submitted data
  console.log(JSON.stringify(JSON.parse(event), null, 2));
}
