export type DenoAdapterCertificate = Deno.TlsCertifiedKeyPem &
  DenoAdapterCertifacteStatusData & {
    validity: {
      notBefore: Date;
      notAfter: Date;
    };
  };

export type DenoAdapterCertifacteStatusData = {
  issueDate: Date;
  acmeAccount: {
    email: string;
  };
  domain: string;
};
