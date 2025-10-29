import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {
        // In production, use simple JSON output without worker threads
        // This avoids worker.js module resolution issues in Docker/Next.js
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
          log: (object) => {
            // Format readable timestamp in production
            if (object.time && (typeof object.time === 'string' || typeof object.time === 'number')) {
              const date = new Date(object.time);
              object.time = date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            }
            return object;
          },
        },
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
      }),
});

// Prevent memory leaks in development (Node.js runtime only)
if (!isProduction && typeof process.stdout !== 'undefined') {
  process.stdout.setMaxListeners?.(20);
  process.stderr.setMaxListeners?.(20);
}

export default logger;

