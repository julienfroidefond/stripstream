import type { ErrorCode } from "@/constants/errorCodes";

export interface AppErrorType extends Error {
  code: ErrorCode;
  message: string;
  name: string;
}
