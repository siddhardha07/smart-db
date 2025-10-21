import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { DatabaseConnection } from './db/dbConnection';
import schemaRoutes from './routes/schema';
import dataRoutes from './routes/data';

// Load environment variables
dotenv.config();

class App {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001');
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeDatabase();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // CORS configuration - allow multiple frontend ports
    this.app.use(cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        process.env.FRONTEND_URL || 'http://localhost:5173'
      ],
      credentials: true
    }));

    // Body parser middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      // eslint-disable-next-line no-console
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SmartDB AI Backend'
      });
    });

    // API routes
    this.app.use('/api/schema', schemaRoutes);
    this.app.use('/api/data', dataRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'SmartDB AI Backend API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          schema: '/api/schema',
          data: '/api/data',
          createTables: 'POST /api/schema/create-from-mermaid',
          insertData: 'POST /api/data/insert'
        }
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      // eslint-disable-next-line no-console
      console.error('Global error handler:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    });
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      DatabaseConnection.initialize();
      
      // Test the connection
      const isConnected = await DatabaseConnection.testConnection();
      if (isConnected) {
        // eslint-disable-next-line no-console
        console.log('✅ Database connection established successfully');
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ Database connection failed');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Database initialization error:', error);
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 SmartDB AI Backend running on port ${this.port}`);
        // eslint-disable-next-line no-console
        console.log(`📍 API available at: http://localhost:${this.port}`);
        // eslint-disable-next-line no-console
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🛑 Shutting down server...');
    
    try {
      await DatabaseConnection.close();
      // eslint-disable-next-line no-console
      console.log('✅ Database connections closed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error closing database connections:', error);
    }
  }

  /**
   * Get Express app instance (useful for testing)
   */
  public getApp(): Application {
    return this.app;
  }
}

// Create and start the application
const app = new App();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  app.start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
