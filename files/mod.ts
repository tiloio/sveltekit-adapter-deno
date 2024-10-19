import { serveDir, serveFile } from "file_server";
import { dirname, extname, join } from "path";
import Plugins from "";

const Plugins = [PLUGINS_ARRAY];

import server from "SERVER";

const initialized = server.init({ env: Deno.env.toObject() });

const prerendered: Set<string> = new Set(PRERENDERED);

const appDir = "APP_DIR";
const baseDir = dirname(CURRENT_DIRNAME);
const rootDir = join(baseDir, "static");

const options = {
  port: parseInt(Deno.env.get("PORT") ?? "443"),
};

for (const plugin of Plugins) {
  console.log(`⏳ Init plugin "${plugin.name}"...`);
  const { newServeOptions } = await plugin.init({
    serveOptions: options,
    appDir,
    baseDir,
    rootDir,
    prerendered,
    env: Deno.env.toObject(),
  });
  if (newServeOptions) {
    Object.assign(options, newServeOptions);
    console.log(`🏗️ Plugin "${plugin.name}" changed serve options.`);
  }
  console.log(`✅ Initialized plugin "${plugin.name}".`);
}

Deno.serve(
  options,
  async (request: Request, info: Deno.ServeHandlerInfo): Promise<Response> => {
    // Get client IP address
    const clientAddress =
      request.headers.get("x-forwarded-for") ?? info.remoteAddr.hostname;

    const { pathname } = new URL(request.url);

    // Path has trailing slash
    const slashed = pathname.at(-1) === "/";

    // Handle trailing slash redirects for prerendered routes
    const location = slashed ? pathname.slice(0, -1) : `${pathname}/`;
    if (prerendered.has(location)) {
      return new Response(null, {
        status: 308,
        statusText: "Permanent Redirect",
        headers: {
          location,
        },
      });
    }

    // Try prerendered route with html extension
    if (!slashed && !extname(pathname) && prerendered.has(pathname)) {
      const response = await serveFile(
        request,
        join(rootDir, `${pathname}.html`)
      );
      if (response.ok || response.status === 304) {
        return response;
      }
    }

    // Try static files (ignore redirects and errors)
    const response = await serveDir(request, {
      fsRoot: rootDir,
      quiet: true,
    });
    if (response.ok || response.status === 304) {
      if (
        pathname.startsWith(`/${appDir}/immutable/`) &&
        response.status === 200
      ) {
        response.headers.set(
          "cache-control",
          "public, max-age=31536000, immutable"
        );
      }
      return response;
    }

    // Pass to the SvelteKit server
    await initialized;
    return server.respond(request, {
      getClientAddress: () => clientAddress,
    });
  }
);

if (usesSslCertificate) {
  Deno.serve({ port: 80 }, (req) => {
    const url = new URL(req.url);
    const redirect = new Response(null, {
      status: 301,
      headers: {
        location: `https://${url.hostname}${url.pathname}`,
      },
    });

    return redirect;
  });
}
