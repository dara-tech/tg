'use client';
import type { UpdatesResult, Update } from './schema';

type UpdateHandler = (update: Update) => void;

export class UpdatesManager {
  private handlers = new Map<string, Set<UpdateHandler>>();
  private pts = 0;
  private qts = 0;
  private seq = 0;
  private date = 0;

  on(type: string, handler: UpdateHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: UpdateHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  processUpdates(result: UpdatesResult) {
    const updates = result.updates ?? [];
    for (const update of updates) {
      this.dispatch(update);
    }
    if (result.seq) this.seq = result.seq;
    if (result.date) this.date = result.date;
  }

  private dispatch(update: Update) {
    const handlers = this.handlers.get(update._) ?? this.handlers.get('*');
    handlers?.forEach(h => h(update));
  }

  getState() { return { pts: this.pts, qts: this.qts, seq: this.seq, date: this.date }; }
}
