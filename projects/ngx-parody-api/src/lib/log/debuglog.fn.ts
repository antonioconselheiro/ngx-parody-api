export function debuglog(...args: any[]) {
  console.debug(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', ...args);
}