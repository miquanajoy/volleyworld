import type { Tournament } from "../../domain/types";
import type { WriteAcknowledgement, WriterPhase } from "../contracts";
/** Serial CAS writes. Snapshots are cloned before debounce; failed writes stay pending. */
export class CloudWriter<T = Tournament> {
  revision = 0;
  latest: T | null = null;
  pending: T | null = null;
  running: Promise<void> | null = null;
  paused = true;
  closed = false;
  timer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    public write: (state: T, revision: number) => Promise<WriteAcknowledgement>,
    public status: (
      phase: WriterPhase,
      result?: WriteAcknowledgement | Error,
    ) => void,
  ) {}
  activate(revision: number) {
    this.revision = revision;
    this.paused = false;
  }
  enqueue(state: T) {
    if (this.closed) return;
    this.latest = JSON.parse(JSON.stringify(state)) as T;
    this.pending = this.latest;
    if (this.paused) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 700);
    this.status("pending");
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (this.closed || this.paused || !this.pending) return Promise.resolve();
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  async drain() {
    while (this.pending && !this.paused && !this.closed) {
      const snapshot = this.pending;
      this.pending = null;
      this.status("saving");
      try {
        const result = await this.write(snapshot, this.revision);
        if (this.closed) return;
        this.revision = result.revision;
        this.status(this.pending ? "pending" : "saved", result);
      } catch (cause) {
        if (this.closed) return;
        this.pending = this.pending || snapshot;
        this.paused = true;
        const error = cause instanceof Error ? cause : new Error(String(cause));
        this.status(
          error.message.includes("SAVE_CONFLICT") ? "conflict" : "error",
          error,
        );
      }
    }
  }
  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.pending = null;
  }
}
