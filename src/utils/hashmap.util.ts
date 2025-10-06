type HashNode<K, V> = {
  key: K;
  value: V;
  next?: HashNode<K, V>;
};

export interface IHashMap<K, V> {
  set(key: K, value: V): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  keys(): K[];
  values(): V[];
  entries(): [K, V][];
  getSize(): number;
  getCapacity(): number;
  getLoadFactor(): number;
}

export class HashMap<K, V> implements IHashMap<K, V> {
  private buckets: Array<HashNode<K, V> | undefined>;
  private capacity: number;
  private size: number;
  private readonly loadFactorThreshold: number;
  private readonly minCapacity: number;
  private hashFunction: (key: K) => string;

  constructor(
    capacity = 32,
    loadFactorThreshold = 0.75,
    hashFunction?: (key: K) => string,
  ) {
    this.capacity = Math.max(capacity, 16);
    this.minCapacity = this.capacity;
    this.loadFactorThreshold = loadFactorThreshold;
    this.buckets = new Array(this.capacity);
    this.size = 0;
    this.hashFunction = hashFunction || this.defaultHashFunction;
  }

  private defaultHashFunction(key: K): string {
    if (typeof key === 'string') return key;
    if (typeof key === 'number') return key.toString();
    if (typeof key === 'object' && key !== null) {
      return JSON.stringify(key);
    }
    return String(key);
  }

  private hash(key: K): number {
    const strKey = this.hashFunction(key);
    let hash = 0;

    // DJB2 hash algorithm - better distribution
    for (let i = 0; i < strKey.length; i++) {
      hash = (hash * 33) ^ strKey.charCodeAt(i);
    }

    // Ensure positive and within capacity
    return Math.abs(hash) % this.capacity;
  }

  private shouldResize(): boolean {
    return this.size / this.capacity >= this.loadFactorThreshold;
  }

  private resize(newCapacity: number): void {
    const oldBuckets = this.buckets;
    this.capacity = newCapacity;
    this.buckets = new Array(newCapacity);
    this.size = 0;

    // Rehash all existing entries
    for (const bucket of oldBuckets) {
      let node = bucket;
      while (node) {
        this.set(node.key, node.value);
        node = node.next;
      }
    }
  }

  set(key: K, value: V): void {
    const index = this.hash(key);
    let node = this.buckets[index];

    // If bucket is empty, create new node
    if (!node) {
      this.buckets[index] = { key, value };
      this.size++;

      if (this.shouldResize()) {
        this.resize(this.capacity * 2);
      }
      return;
    }

    // Check if key exists and update
    let prev: HashNode<K, V> | undefined;
    while (node) {
      if (node.key === key) {
        node.value = value;
        return;
      }
      prev = node;
      node = node.next;
    }

    // Add new node at the end
    prev!.next = { key, value };
    this.size++;

    if (this.shouldResize()) {
      this.resize(this.capacity * 2);
    }
  }

  get(key: K): V | undefined {
    const index = this.hash(key);
    let node = this.buckets[index];

    while (node) {
      if (node.key === key) return node.value;
      node = node.next;
    }

    return undefined;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    const index = this.hash(key);
    let node = this.buckets[index];
    let prev: HashNode<K, V> | undefined;

    while (node) {
      if (node.key === key) {
        if (prev) {
          prev.next = node.next;
        } else {
          this.buckets[index] = node.next;
        }
        this.size--;

        // Shrink if load factor is too low
        const loadFactor = this.size / this.capacity;
        if (
          loadFactor < this.loadFactorThreshold / 4 &&
          this.capacity > this.minCapacity
        ) {
          this.resize(Math.max(this.capacity / 2, this.minCapacity));
        }

        return true;
      }
      prev = node;
      node = node.next;
    }

    return false;
  }

  clear(): void {
    this.buckets = new Array(this.capacity);
    this.size = 0;
  }

  keys(): K[] {
    const keys: K[] = [];
    for (const bucket of this.buckets) {
      let node = bucket;
      while (node) {
        keys.push(node.key);
        node = node.next;
      }
    }
    return keys;
  }

  values(): V[] {
    const values: V[] = [];
    for (const bucket of this.buckets) {
      let node = bucket;
      while (node) {
        values.push(node.value);
        node = node.next;
      }
    }
    return values;
  }

  entries(): [K, V][] {
    const entries: [K, V][] = [];
    for (const bucket of this.buckets) {
      let node = bucket;
      while (node) {
        entries.push([node.key, node.value]);
        node = node.next;
      }
    }
    return entries;
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getLoadFactor(): number {
    return this.size / this.capacity;
  }

  // Iterator support
  *[Symbol.iterator](): Iterator<[K, V]> {
    for (const bucket of this.buckets) {
      let node = bucket;
      while (node) {
        yield [node.key, node.value];
        node = node.next;
      }
    }
  }

  // For debugging
  toString(): string {
    const entries = this.entries();
    return `HashMap(${entries.length}) { ${entries.map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
  }
}
