"use client";

import { PropsWithChildren, useEffect } from "react";
import "@/i18n/i18n";

export function I18nProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
