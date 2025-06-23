import path from "path";
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseWorkerPool {
  constructor(poolSize = 4) {
    this.poolSize = poolSize;
    this.workers = [];
    this.activeQueries = new Map();
    this.queryIdCounter = 0;
    this.currentWorkerIndex = 0;
  }

  async initialize(dbConfig) {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(__dirname + '/dbWorker.js');
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });
      
      this.workers.push(worker);
      
      // Initialize the worker
      await this.sendToWorker(worker, {
        type: 'init',
        config: dbConfig
      });
    }
  }

  handleWorkerMessage(message) {
    const { type, id, result, error } = message;
    
    if (this.activeQueries.has(id)) {
      const { resolve, reject } = this.activeQueries.get(id);
      this.activeQueries.delete(id);
      
      if (type === 'query-result' || type === 'init-success') {
        resolve(result);
      } else if (type === 'error') {
        reject(new Error(error));
      }
    }
  }

  async sendToWorker(worker, message) {
    return new Promise((resolve, reject) => {
      const id = ++this.queryIdCounter;
      message.id = id;
      
      this.activeQueries.set(id, { resolve, reject });
      worker.postMessage(message);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.activeQueries.has(id)) {
          this.activeQueries.delete(id);
          reject(new Error('Query timeout'));
        }
      }, 300000);
    });
  }

  async executeQuery(query) {
    // Round-robin worker selection
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.poolSize;
    
    return this.sendToWorker(worker, {
      type: 'query',
      query
    });
  }

  async shutdown() {
    const shutdownPromises = this.workers.map(worker =>
      this.sendToWorker(worker, { type: 'shutdown' }).catch(() => {})
    );
    
    await Promise.all(shutdownPromises);
    this.workers = [];
  }
}