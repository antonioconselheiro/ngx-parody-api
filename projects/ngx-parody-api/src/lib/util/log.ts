export const log = {
  debug: (...args: any[]) => console.debug(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', ...args),
  error: (...args: any[]) => console.error(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', ...args),
  warn: (...args: any[]) => console.warn(new Date().toLocaleString(), '[' + Math.floor(new Date().getTime() / 1000) + ']', ...args)
}