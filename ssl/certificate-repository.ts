import * as path from "jsr:@std/path@1.0.6";
import type {
  DenoAdapterCertifacteStatusData,
  DenoAdapterCertificate,
} from "./certificate-schema.ts";
import { ensureDir, exists } from "jsr:@std/fs@1.0.4";
import * as JSONC from "jsr:@std/jsonc@1.0.1";
import { CertUtils } from "jsr:@fishballpkg/acme@0.10.0";

export function CertficateRepository(dirName: string) {
  const CERT_DIR_PATH = path.join(path.dirname(Deno.execPath()), dirName); // TODO change execPath if not compiled to other

  const FILE_PATHS = {
    CERT: path.join(CERT_DIR_PATH, "cert.pem"),
    PRIVATE_KEY: path.join(CERT_DIR_PATH, "private_key.pem"),
    STATUS_DATA: path.join(CERT_DIR_PATH, "status-data.jsonc"),
  };

  return {
    async load(): Promise<DenoAdapterCertificate> {
      const [certFile, privateKeyFile, statusDataFile] = await Promise.all([
        Deno.readTextFile(FILE_PATHS.CERT),
        Deno.readTextFile(FILE_PATHS.PRIVATE_KEY),
        Deno.readTextFile(FILE_PATHS.STATUS_DATA),
      ]);

      const statusData = StatusData().parse(statusDataFile);

      const validity = CertUtils.decodeValidity(certFile);

      return {
        cert: certFile,
        key: privateKeyFile,
        keyFormat: "pem",
        ...statusData,
        validity,
      };
    },
    async save(certificate: DenoAdapterCertificate) {
      await ensureDir(CERT_DIR_PATH);

      // TODO: save domain and issue date in jsonc file to check if certificate is still valid!
      await Promise.all([
        Deno.writeTextFile(FILE_PATHS.CERT, certificate.cert),
        Deno.writeTextFile(FILE_PATHS.PRIVATE_KEY, certificate.key),
        Deno.writeTextFile(
          FILE_PATHS.STATUS_DATA,
          StatusData().stringify(certificate)
        ),
      ]);
    },
    async cerficateExists(): Promise<boolean> {
      const filesExists = await Promise.all(
        Object.values(FILE_PATHS).map((filePath) =>
          exists(filePath, { isFile: true })
        )
      );
      return filesExists.every((exist) => exist);
    },
  };
}

function StatusData() {
  return {
    parse(statusDataFileContent: string) {
      const statusData = JSONC.parse(statusDataFileContent) as unknown;

      if (!statusData || typeof statusData !== "object") {
        throw new Error(
          `SSL Certificate status data is invalid: file is empty.`
        );
      }

      if (
        !("issueDate" in statusData) ||
        typeof statusData.issueDate !== "number"
      ) {
        throw new Error(
          `SSL Certificate status data is invalid: issueDate is missing or is not a number in the getTime() JavaScript format.`
        );
      }

      if (
        !("acmeAccount" in statusData) ||
        typeof statusData.acmeAccount !== "object" ||
        !statusData.acmeAccount ||
        !("email" in statusData.acmeAccount) ||
        typeof statusData.acmeAccount.email !== "string"
      ) {
        throw new Error(
          `SSL Certificate status data is invalid: acmeAccount.email is missing or is not a string.`
        );
      }

      if (!("domain" in statusData) || typeof statusData.domain !== "string") {
        throw new Error(
          `SSL Certificate status data is invalid: domain is missing or is not a string.`
        );
      }

      return {
        issueDate: new Date(statusData.issueDate),
        acmeAccount: {
          email: statusData.acmeAccount.email,
        },
        domain: statusData.domain,
      };
    },
    stringify(statusData: DenoAdapterCertifacteStatusData) {
      return JSON.stringify(
        {
          issueDate: statusData.issueDate.getTime(),
          acmeAccount: { email: statusData.acmeAccount.email },
          domain: statusData.domain,
        },
        null,
        "    "
      );
    },
  };
}
