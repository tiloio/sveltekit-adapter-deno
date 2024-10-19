import { Adapter } from "@sveltejs/kit";
import { BuildOptions } from "esbuild";

interface AdapterOptions {
  out?: string;
  buildOptions?: BuildOptions;
  ssl?: boolean;
  usage?: "deno" | "deno-compile";
  plugins?: AdapterPlugin[];
}

export interface AdapterPlugin {
  name: string;
  moduleLocation: string;
  init(options: {
    serveOptions: Deno.ListenOptions;
    appDir: string;
    baseDir: string;
    rootDir: string;
    prerendered: Set<string>;
    env: Record<string, string>;
  }): Promise<{ newServeOptions?: Deno.ListenOptions }>;
}

export default function plugin(options?: AdapterOptions): Adapter;
