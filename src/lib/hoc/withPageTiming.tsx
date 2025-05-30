import { DebugService } from "@/lib/services/debug.service";

type PageComponent = (props: any) => Promise<JSX.Element> | JSX.Element;

export function withPageTiming(pageName: string, Component: PageComponent) {
  return async function PageWithTiming(props: any) {
    const start = performance.now();
    const result = await Promise.resolve(Component(props));
    const duration = performance.now() - start;

    // Ensure params is awaited before using it
    const params = props.params ? await Promise.resolve(props.params) : {};
    await DebugService.logPageRender(pageName + JSON.stringify(params), duration);

    return result;
  };
}
