declare module 'dotenv' {
  export interface ConfigOptions {
    path?: string
  }
  export function config(options?: ConfigOptions): { parsed?: Record<string, string> }
}
