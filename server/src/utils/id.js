export function makeOrderId() {
  // PK: O + timestamp (ms)
  return `O${Date.now()}`;
}

