import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Sequelize } from 'sequelize';

if (!isMainThread) {
  // This runs in the worker thread
  let sequelize = null;

  const initializeConnection = async (config) => {

    const dialectOptions = {};

      // Only add SSL configuration if SSL is enabled
      if (process.env.PTSDB_USE_SSL === "true") {
        dialectOptions.ssl = {
          require: true,
          rejectUnauthorized: false,
        };
      }

    sequelize = new Sequelize(config.uri, {
      dialect: "postgres",
      protocol: "postgres",
      logging: false,
      dialectOptions,
      pool: {
        max: 5, // Smaller pool per worker
        min: 0,
        acquire: 60000,
        idle: 10000,
      },
    });
    
    await sequelize.authenticate();
    return true;
  };

  const executeQuery = async (query) => {
    if (!sequelize) {
      throw new Error('Database not initialized in worker');
    }
    
    // Apply the same query transformations as original
    let resultQuery = query;
    resultQuery = resultQuery.replace(
      /("branch"\s*=\s*')(\d+\.\d+\.\d+\.\d+)_\w+(')/g,
      "$1$2$3"
    );
    resultQuery = resultQuery.replace(
      /(')(\d+\.\d+\.\d+\.\d+)_\w+(:')/g,
      "$1$2$3"
    );
    
    const [response] = await sequelize.query(resultQuery);
    return response;
  };

  // Listen for messages from main thread
  parentPort.on('message', async (message) => {
    try {
      switch (message.type) {
        case 'init':
          await initializeConnection(message.config);
          parentPort.postMessage({ type: 'init-success', id: message.id });
          break;
          
        case 'query':
          const result = await executeQuery(message.query);
          parentPort.postMessage({ 
            type: 'query-result', 
            id: message.id, 
            result 
          });
          break;
          
        case 'shutdown':
          if (sequelize) {
            await sequelize.close();
          }
          process.exit(0);
          break;
      }
    } catch (error) {
      parentPort.postMessage({ 
        type: 'error', 
        id: message.id, 
        error: error.message 
      });
    }
  });
}