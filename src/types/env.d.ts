declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_DEFAULT_KOMGA_URL?: string;
    NEXT_PUBLIC_APP_VERSION: string;
  }
}
