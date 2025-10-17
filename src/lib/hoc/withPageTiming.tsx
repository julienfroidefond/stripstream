import { ReactElement } from "react";
import { DebugService } from "@/lib/services/debug.service";

type PageComponent = (props: any) => Promise<ReactElement> | ReactElement;

export function withPageTiming(pageName: string, Component: PageComponent) {
  return async function PageWithTiming(props: any) {
    const start = performance.now();
    const result = await Promise.resolve(Component(props));
    const duration = performance.now() - start;

    // Ensure params is awaited before using it
    const params = props.params ? await Promise.resolve(props.params) : {};
    
    // Only log if debug is enabled and user is authenticated
    try {
      await DebugService.logPageRender(pageName + JSON.stringify(params), duration);
    } catch {
      // Silently fail if user is not authenticated or debug is disabled
      // This prevents errors on public pages like /login
    }

    return result;
  };
}
