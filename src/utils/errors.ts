import { ERROR_MESSAGES } from "../constants/errorMessages";
import { ErrorCode } from "../constants/errorCodes";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public params: Record<string, string | number> = {},
    public originalError?: unknown
  ) {
    let message = ERROR_MESSAGES[code];

    // Replace parameters in message
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });

    super(message);
    this.name = "AppError";
  }
}

export const getErrorMessage = (
  code: ErrorCode,
  params: Record<string, string | number> = {}
): string => {
  let message = ERROR_MESSAGES[code];

  // Replace parameters in message
  Object.entries(params).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, String(value));
  });

  return message;
};
