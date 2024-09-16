export default class Registry<T> {
  protected readonly items: Record<string, T> = {};

  public register(name: string, item: T): string {
    if (!item) {
      throw new Error('item cannot be null or undefined');
    }

    this.items[name] = item;
    return name;
  }

  public get(name: string): T {
    return this.items[name];
  }

  public All(): Record<string, T> {
    return this.items;
  }

  public Keys(): string[] {
    return Object.keys(this.items);
  }

  public values(): T[] {
    return Object.values(this.items);
  }
}
