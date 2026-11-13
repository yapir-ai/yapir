FROM oven/bun:1.4.3 AS runner

WORKDIR /yapir
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY tsconfig.json ./
COPY src/server src/server
COPY src/runner src/runner
RUN bun build src/runner/main.ts --compile --outfile=/yapir-runner

FROM oven/bun:1.4.3 AS opencode

WORKDIR /opencode
RUN bun add @opencode/cli-linux-x64@2.1.2

FROM buildpack-deps:trixie

# GitHub's host runner owns its mounted command files as UID 1001.
RUN groupadd --gid 65532 agent && useradd --uid 65532 --gid agent agent

RUN install -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
  && echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable" > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce docker-ce-rootless-extras docker-compose-plugin uidmap slirp4netns iproute2 libcap2-bin iptables \
  && rm -rf /var/lib/apt/lists/*
# The daemon maps the agent's subordinate IDs. A setuid newuidmap would run as root, which does not own the
# daemon's user namespace: under Ubuntu's AppArmor restriction, it would need CAP_SYS_ADMIN.
RUN echo agent:100000:65536 > /etc/subuid && echo agent:100000:65536 > /etc/subgid \
  && chmod u-s /usr/bin/newuidmap /usr/bin/newgidmap \
  && setcap cap_setuid=ep /usr/bin/newuidmap \
  && setcap cap_setgid=ep /usr/bin/newgidmap

# The egress proxy runs as its own user, out of the agent's reach.
RUN useradd --system --no-create-home egress \
  && curl -fsSL https://downloads.mitmproxy.org/12.3.1/mitmproxy-12.3.1-linux-x86_64.tar.gz | tar -xz -C /usr/local/bin mitmdump
COPY src/runner/egress.py /usr/local/lib/yapir/egress.py

COPY --from=ghcr.io/jdx/mise:2026.10.17 /usr/local/bin/mise /usr/local/bin/mise
COPY --from=opencode /opencode/node_modules/@opencode/cli-linux-x64/bin/opencode /usr/local/bin/opencode

# The Claude Agent SDK's native binary, at the version its package pins.
COPY --from=runner /yapir/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude /usr/local/bin/claude
# The Codex SDK's native package, at the version its package pins, with the tools Codex expects on PATH.
COPY --from=runner /yapir/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl /opt/codex
ENV PATH="/opt/codex/codex-path:${PATH}"
COPY --from=runner /yapir-runner /usr/local/bin/yapir-runner
