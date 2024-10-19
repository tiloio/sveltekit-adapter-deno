import type { AdapterPlugin } from "../index.d.ts";
import { getOrCreateCerficate } from "./ssl.ts";

export function SslPlugin(): AdapterPlugin {
  return {
    name: "deno-ssl-plugin",
    moduleLocation: new URL(import.meta.url).pathname,
    async init(data) {
      const sslCertificate = await getOrCreateCerficate();

      return {
        newServeOptions: {
          ...data.serveOptions,
          key: sslCertificate.key,
          cert: sslCertificate.cert,
        },
      };
    },
  };
}
