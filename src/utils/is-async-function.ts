export default function isAsyncFunction(
  fn: (...args: never[]) => unknown,
): boolean {
  return fn.constructor.name === 'AsyncFunction'
}
