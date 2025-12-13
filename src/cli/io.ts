export type CliIO = Readonly<{
  stdout: NodeJS.WritableStream
  stderr: NodeJS.WritableStream
}>

export const defaultIO: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
}

export const writeJson = (
  stream: NodeJS.WritableStream,
  payload: unknown,
): void => {
  stream.write(`${JSON.stringify(payload)}\n`)
}
