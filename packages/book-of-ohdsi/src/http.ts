import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { loadManifest, type Manifest } from "./manifest.js";
import { buildSearchIndex, type SearchIndex } from "./search.js";
import { createServer } from "./server.js";

export type HttpHandler = (request: Request) => Promise<Response>;

type Bundle = {
  manifest: Manifest;
  searchIndex: SearchIndex;
};

let bundlePromise: Promise<Bundle> | null = null;

function getBundle(): Promise<Bundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const manifest = loadManifest();
      const searchIndex = await buildSearchIndex(manifest);
      return { manifest, searchIndex };
    })();
  }
  return bundlePromise;
}

export async function createHttpHandler(): Promise<HttpHandler> {
  await getBundle();
  return async (request) => {
    const { manifest, searchIndex } = await getBundle();
    const server = createServer(manifest, searchIndex);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await transport.close();
      await server.close();
    }
  };
}
