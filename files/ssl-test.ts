import { getOrCreateCerficate } from "./ssl/ssl.ts";

const cert = await getOrCreateCerficate();
console.log(cert);