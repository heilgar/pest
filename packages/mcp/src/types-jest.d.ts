declare global {
  namespace jest {
    interface Matchers<R> {
      toExposeTools(names: string[]): Promise<R>;
      toExposeTool(name: string): Promise<R>;
      toHaveValidToolSchemas(): Promise<R>;
      toExposePrompts(names: string[]): Promise<R>;
      toExposeResources(uris: string[]): Promise<R>;
    }
  }
}
