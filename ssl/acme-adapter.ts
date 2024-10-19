import type { Spinner } from "jsr:@std/cli@1.0.6/unstable-spinner";
import type { DenoAdapterCertificate } from "./certificate-schema.ts";
import {
  ACME_DIRECTORY_URLS,
  AcmeClient,
  AcmeWorkflows,
  CertUtils,
} from "jsr:@fishballpkg/acme@0.10.0";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5";

export function AcmeAdapter() {
  return {
    async getNewCertificate({
      spinner,
      domain,
      email,
    }: {
      spinner: Spinner;
      domain: string;
      email: string;
    }): Promise<DenoAdapterCertificate> {
      const ACME_DOMAIN = `_acme-challenge.${domain}`;

      const acmeClient = await AcmeClient.init(
        ACME_DIRECTORY_URLS.LETS_ENCRYPT
      );

      const acmeAccount = await acmeClient.createAccount({
        emails: [email],
      });

      const { certificate, certKeyPair } =
        await AcmeWorkflows.requestCertificate({
          acmeAccount,
          domains: [domain],
          updateDnsRecords: async (dnsRecords) => {
            spinner.stop();

            console.log("Please add this DNS record to your DNS provider:");
            dnsRecords.forEach((dnsRecord) =>
              console.table([
                {
                  type: dnsRecord.type,
                  name: dnsRecord.name,
                  content: dnsRecord.content,
                },
              ])
            );
            alert(`Confirm when DNS is updated.`);
            spinner.start();

            spinner.message = `Waiting that all associated nameservers get the correct DNS TXT record entry for "${ACME_DOMAIN}"...`;
          },
        });

      const validity = CertUtils.decodeValidity(certificate);

      return {
        cert: certificate,
        key: await exportCryptoKey(certKeyPair.privateKey),
        keyFormat: "pem",
        issueDate: new Date(),
        acmeAccount: { email },
        validity,
        domain,
      };
    },
  };
}

async function exportCryptoKey(key: CryptoKey) {
  const exported = await globalThis.crypto.subtle.exportKey("pkcs8", key);
  const exportedAsBase64 = encodeBase64(exported);
  const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  return pemExported;
}
