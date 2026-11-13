import { mkdir } from "node:fs/promises";

import { $ } from "bun";
import { z } from "zod";

import { waitUntilReady } from "./process-ready";

const port = 15_001;
const configDirectory = "/run/egress";
const caCertificate = "/usr/local/share/ca-certificates/yapir-egress.crt";
const systemCertificates = "/etc/ssl/certs/ca-certificates.crt";
const javaTrustStore = "/etc/ssl/yapir-java-truststore.p12";

// Only HTTPS: the proxy verifies the host's certificate before it sends the secret.
const InjectedCredentials = z.array(
  z.strictObject({
    url: z.url({ protocol: /^https$/u }),
    header: z.string().min(1),
    value: z.string().min(1),
  })
);

export const injectedCredentials = () =>
  InjectedCredentials.parse(
    Bun.YAML.parse(process.env.YAPIR_CREDENTIALS ?? "[]")
  );

export const egressEnvironment = {
  SSL_CERT_FILE: systemCertificates,
  NODE_EXTRA_CA_CERTS: caCertificate,
  REQUESTS_CA_BUNDLE: systemCertificates,
  JAVA_TOOL_OPTIONS: `-Djavax.net.ssl.trustStore=${javaTrustStore} -Djavax.net.ssl.trustStorePassword=changeit`,
};

interface Egress {
  credentials: z.infer<typeof InjectedCredentials>;
  allowedHosts: string[] | null;
}

// The proxy runs as `egress`: the agent cannot read the secrets in its environment.
export async function startEgressProxy(egress: Egress) {
  await mkdir(configDirectory, { mode: 0o700 });
  await $`chown egress:egress ${configDirectory}`;
  const { PATH } = process.env;

  const proxy = Bun.spawn(
    [
      "setpriv",
      "--reuid=egress",
      "--regid=egress",
      "--clear-groups",
      "--no-new-privs",
      "mitmdump",
      "--mode=transparent",
      "--listen-host=127.0.0.1",
      `--listen-port=${port}`,
      `--set=confdir=${configDirectory}`,
      // The job can trust a private CA for its registries.
      `--set=ssl_verify_upstream_trusted_ca=${systemCertificates}`,
      // Under a network policy, the proxy connects once it knows the host, which it may change.
      // Without it, the eager default keeps the protocols in which the server speaks first.
      ...(egress.allowedHosts === null
        ? []
        : ["--set=connection_strategy=lazy"]),
      "--set=flow_detail=0",
      "--set=termlog_verbosity=warn",
      "--scripts=/usr/local/lib/yapir/egress.py",
    ],
    {
      env: {
        PATH,
        YAPIR_EGRESS: JSON.stringify(egress),
      },
      stdout: "inherit",
    }
  );

  await waitUntilReady(
    "The egress proxy",
    proxy,
    // A connection to the proxy without a redirect would log an error.
    async () => (await $`ss -Hltn sport = :${port}`.text()) !== ""
  );

  await trustProxyCa();
  await redirectAgentTraffic(egress.allowedHosts !== null);

  return proxy;
}

async function trustProxyCa() {
  await $`cp ${configDirectory}/mitmproxy-ca-cert.pem ${caCertificate}`;
  await $`update-ca-certificates`.quiet();
  // Java reads PKCS12 entries as trusted only with its own attribute.
  await $`openssl pkcs12 -export -nokeys -jdktrust anyExtendedKeyUsage -in ${systemCertificates} -out ${javaTrustStore} -passout pass:changeit`;
  await $`chmod 644 ${javaTrustStore}`;
}

// The agent reaches the job's services directly. Its IPv6 traffic would bypass the proxy: it falls back to IPv4.
async function redirectAgentTraffic(networkPolicy: boolean) {
  const agent = ["-m", "owner", "--uid-owner", "agent"];
  const subnets = await jobSubnets();

  try {
    for (const subnet of subnets) {
      await $`iptables -t nat -A OUTPUT ${agent} -d ${subnet} -j RETURN`;
    }

    if (networkPolicy) {
      await $`iptables -t nat -A OUTPUT ${agent} -p tcp --dport 53 -j RETURN`;
    }

    await $`iptables -t nat -A OUTPUT ${agent} -p tcp ! -d 127.0.0.0/8 -j REDIRECT --to-ports ${port}`;
    await $`ip6tables -A OUTPUT ${agent} ! -o lo -j REJECT`;

    if (networkPolicy) {
      await $`iptables -A OUTPUT ${agent} -o lo -j ACCEPT`;
      await $`iptables -A OUTPUT ${agent} -m conntrack --ctstate DNAT -j ACCEPT`;
      await $`iptables -A OUTPUT ${agent} -p udp --dport 53 -j ACCEPT`;
      await $`iptables -A OUTPUT ${agent} -p tcp --dport 53 -j ACCEPT`;

      for (const subnet of subnets) {
        await $`iptables -A OUTPUT ${agent} -d ${subnet} -j ACCEPT`;
      }

      await $`iptables -A OUTPUT ${agent} -j REJECT`;
    }
  } catch (error) {
    throw new Error(
      "The runner cannot redirect the agent's traffic to the egress proxy: give NET_ADMIN to the job's container",
      { cause: error }
    );
  }
}

// The job's services are on the networks of its container.
async function jobSubnets() {
  const routes = LinkRoutes.parse(
    await $`ip -4 -json route show scope link`.json()
  );

  return routes.map(({ dst }) => dst);
}

const LinkRoutes = z.array(z.object({ dst: z.string() }));
