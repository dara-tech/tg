// Minimal TL (de)serializer
export class TLSerializer {
  static serialize(method: string, params: Record<string, unknown>): Uint8Array {
    // Real impl: TL schema lookup + binary encoding
    const json = JSON.stringify({ method, params });
    return new TextEncoder().encode(json);
  }
}

export class TLDeserializer {
  static deserialize(data: Uint8Array): Record<string, unknown> {
    // Real impl: read TL constructor id + fields
    try {
      return JSON.parse(new TextDecoder().decode(data));
    } catch {
      return { _: 'unknown' };
    }
  }
}
