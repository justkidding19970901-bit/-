import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { ServerResponse } from 'http';

/**
 * Dev-only sync endpoint: an EasyStore userscript posts a CSV to /__sync,
 * we cache it in memory and broadcast an SSE notification on /__sync/events.
 * The React app subscribes and pulls /__sync to grab the CSV body.
 *
 *   POST /__sync         (text/csv body)
 *   GET  /__sync         (returns latest CSV)
 *   GET  /__sync/events  (text/event-stream)
 *
 * CORS is wide-open because this is dev-only; never enable in a production
 * build. The middleware no-ops outside of dev.
 */
function easyStoreSyncPlugin(): Plugin {
  let latest: { csv: string; timestamp: number } | null = null;
  const subscribers = new Set<ServerResponse>();

  return {
    name: 'easystore-sync',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
        if (url.pathname !== '/__sync' && url.pathname !== '/__sync/events') {
          return next();
        }

        // CORS — allow EasyStore admin (and any other origin) to POST during dev
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (url.pathname === '/__sync' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', c => chunks.push(c));
          req.on('end', () => {
            const csv = Buffer.concat(chunks).toString('utf-8');
            latest = { csv, timestamp: Date.now() };
            const event = `data: ${JSON.stringify({
              size: csv.length,
              timestamp: latest.timestamp,
            })}\n\n`;
            for (const s of subscribers) {
              try { s.write(event); } catch { /* peer gone */ }
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, size: csv.length }));
          });
          return;
        }

        if (url.pathname === '/__sync' && req.method === 'GET') {
          if (latest) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.end(latest.csv);
          } else {
            res.statusCode = 404;
            res.end('no sync available');
          }
          return;
        }

        if (url.pathname === '/__sync/events' && req.method === 'GET') {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.write(': hello\n\n');
          subscribers.add(res);
          req.on('close', () => subscribers.delete(res));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), easyStoreSyncPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
