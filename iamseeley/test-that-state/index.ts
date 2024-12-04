import { nodes, state } from "membrane";

// Basic assignment
state.basic = 1;              // =

// Compound assignments
state.plus += 1;              // +=
state.minus -= 1;             // -=
state.multiply *= 2;          // *=
state.divide /= 2;            // /=
state.modulo %= 2;            // %=
state.exponent **= 2;         // **=

// Bitwise assignments
state.bitwiseAnd &= 1;        // &=
state.bitwiseOr |= 1;         // |=
state.bitwiseXor ^= 1;        // ^=
state.leftShift <<= 1;        // <<=
state.rightShift >>= 1;       // >>=
state.unsignedRightShift >>>= 1; // >>>=

// Logical assignments
state.nullish ??= 0;          // ??=  (assigns if current value is null/undefined)
state.and &&= true;           // &&=  (assigns if current value is truthy)
state.or ||= false;           // ||=  (assigns if current value is falsy)

// Using 'as' keyword for type assertion
state.asAssertion = "123" as number;

// Using angle bracket syntax for type assertion
state.angleBracketAssertion = <number>"456";



// Using nullish coalescing operator
state.nullishCoalescing = state.someUndefinedProp ?? "default value";

// Using logical OR operator
state.logicalOr = state.anotherUndefinedProp || "fallback value";

// Complex binary expression
state.complexBinary = 'test' + 5;

// Function that uses and modifies state
export async function run() {
  console.log("Current state:", state);
  
  // Modify state
  state.counter = (state.counter || 0) - 1;
  
  // Use different types
  state.arrayExample = [1, 2, 3];
  state.objectExample = { key: "value" };
  
  console.log("Updated state:", state);
}

// Function that assigns a typed parameter to a state property for testing
export function setUserEmail(email: string) {
  state.userEmail = email;
}


export async function endpoint(args) {
  // Use state in the endpoint
  state.lastEndpointCall = new Date();
  return `Path: ${args.path}, State counter: ${state.counter}`;
}

// Function to reset state
export async function resetState() {
  for (const key in state) {
    delete state[key];
  }
  console.log("State reset");
}