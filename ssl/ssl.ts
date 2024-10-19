import { Spinner } from "jsr:@std/cli@1.0.6/unstable-spinner";
import { load } from "jsr:@std/dotenv@0.225.2";
import { CertficateRepository } from "./certificate-repository.ts";
import { AcmeAdapter } from "./acme-adapter.ts";

const DOMAIN = "test.tilo.one";

const acmeAdapter = AcmeAdapter();
const certifacteRepo = CertficateRepository("ssl");

export async function getOrCreateCerficate(): Promise<Deno.TlsCertifiedKeyPem> {
  const spinner = new Spinner({
    message: "Loading SSL Certificats via Let's encrypt...",
    color: "yellow",
  });
  spinner.start();

  const conf = await load({
    envPath: "./.env_prod",
    export: false,
  });

  const email = "tilo.codes@gmail.com";

  const certificateExists = await certifacteRepo.cerficateExists();

  if (certificateExists) {
    spinner.message = "Load existing certifacte...";

    const certificate = await certifacteRepo.load();

    spinner.stop();

    console.log(
      `\🔐 Use existing SSL certificate for "${
        certificate.domain
      }" (valid unti ${certificate.validity.notAfter.toLocaleDateString()}l\n`
    );

    return certificate;
  }

  const certificate = await acmeAdapter.getNewCertificate({
    spinner,
    domain: DOMAIN,
    email,
  });

  spinner.message = "Save certificate to disk.";

  await certifacteRepo.save(certificate);

  spinner.stop();

  return certificate;
}
