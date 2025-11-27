import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import userRoutes from './routes/userRoutes';
import songRoutes from './routes/songRoutes';
import playlistRoutes from './routes/playlistRoutes';
import authRoutes from './routes/authRoutes';
import nftRoutes from './routes/nftRoutes';
import transactionRoutes from './routes/transactionRoutes';
import walletRoutes from './routes/walletRoutes';
import ipfsRoutes from './routes/ipfsRoutes';
import telemetryRoutes from './routes/telemetryRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: [/^http:\/\/localhost:(3001|4000|5173)$/], credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Dujyo API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['routes/**/*.ts'],
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/telemetry', telemetryRoutes);

app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => console.log(`Express API listening on http://localhost:${port}`));

export default app;
