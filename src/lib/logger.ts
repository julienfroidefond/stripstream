import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  // Format timestamp en ISO 8601 lisible en prod
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  ...(isProduction
    ? {
        // En prod, utiliser pino-pretty aussi pour des logs lisibles
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
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
      }),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Prevent memory leaks in development (Node.js runtime only)
if (!isProduction && typeof process.stdout !== 'undefined') {
  process.stdout.setMaxListeners?.(20);
  process.stderr.setMaxListeners?.(20);
}

export default logger;

