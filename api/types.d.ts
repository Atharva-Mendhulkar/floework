declare module 'opossum' {
  interface Options {
    timeout?: number
    errorThresholdPercentage?: number
    resetTimeout?: number
    [key: string]: any
  }

  export default class CircuitBreaker {
    constructor(action: (...args: any[]) => Promise<any>, options?: Options)
    fire(...args: any[]): Promise<any>
    fallback(handler: (...args: any[]) => any): this
    on(event: string, listener: (...args: any[]) => void): this
    [key: string]: any
  }
}
