import { EventEmitter } from 'events';
import type { StoredJob } from '../db/local-store.js';

class JobEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Max listeners configured to prevent warnings with concurrent SSE connections
    this.setMaxListeners(100);
  }

  notifyJobUpdate(job: StoredJob) {
    this.emit('job:update', job);
    this.emit(`job:${job.id}`, job);
  }

  subscribeToJob(jobId: string, listener: (job: StoredJob) => void) {
    this.on(`job:${jobId}`, listener);
    return () => {
      this.off(`job:${jobId}`, listener);
    };
  }
}

export const jobBus = new JobEventEmitter();
