import { DebugService } from "@/lib/services/debug.service";

type PageComponent = (props: any) => Promise<JSX.Element> | JSX.Element;

export function withPageTiming(pageName: string, Component: PageComponent) {
  return async function PageWithTiming(props: any) {
    const start = performance.now();
    const result = await Promise.resolve(Component(props));
    const duration = performance.now() - start;
    // Log le temps de rendu
    await DebugService.logPageRender(pageName + JSON.stringify(props.params), duration);

    return result;
  };
}
