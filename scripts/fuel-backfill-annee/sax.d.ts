declare module 'sax' {
  export interface SAXStream {
    on(
      event: 'opentag',
      handler: (tag: { name: string; attributes: Record<string, unknown> }) => void,
    ): this
    on(event: 'end', handler: () => void): this
    on(event: 'error', handler: (err: Error) => void): this
    write(chunk: string): void
    end(): void
  }

  export function createStream(strict: boolean, options?: { trim?: boolean }): SAXStream
}
