declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_DEFAULT_KOMGA_URL?: string;
    NEXT_PUBLIC_APP_VERSION: string;
    /** URL Stripstream Librarian (fallback si pas de config en base) */
    STRIPSTREAM_URL?: string;
    /** Token API Stripstream (fallback si pas de config en base) */
    STRIPSTREAM_TOKEN?: string;
  }
}
