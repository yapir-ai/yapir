# The runner proxies the agent's egress to inject credentials and apply the network policy

In a CI execution environment, the runner redirects all TCP traffic of the `agent` user to a transparent proxy, mitmdump, which runs as another user. The proxy adds the injected credentials that the CI job declares to the agent's requests, and applies the organization's network policy. The agent thus uses private registries and APIs with the URLs of the repository's configuration, without a secret in its reach. A secret that the agent holds can leak through its output, its transcript or any host. The limits of [ADR 0002](0002-runner-keeps-the-execution-token.md) stay the same.

## Considered options

- Give the agent the secret, in an environment variable or a file. Simpler, but the agent can leak it.
- Proxy URLs on `127.0.0.1` that the repository's configuration must use. Each repository and each tool needs its own configuration, which differs between humans and the agent.
- iron-proxy. It intercepts the TLS of all hosts, and it swaps a placeholder that each tool must send instead of adding a header.

## Consequences

- The proxy decrypts TLS only for the hosts of a credential, with a CA that the runner creates for the execution. The agent's runtimes trust this CA. The other hosts pass through a tunnel, so the CA does not break them. The agent's containers do not trust the CA: credentials do not apply in them.
- The CI job declares the credentials, because the secrets stay in the job: a Yapir administrator cannot send them to another host. Yapir gives the network policy at the claim, because it only restricts. The host of a credential is allowed.
- The proxy adds a credential on its URL prefix for all methods: the scope of the token limits what the agent can do with it.
- The redirect needs `NET_ADMIN` in the job's container. When the runner cannot apply a credential or the network policy, the execution fails.
- The agent can still use a credential through the proxy during the execution, and send data through the DNS or an allowed host.
