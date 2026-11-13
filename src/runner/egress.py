import json
import os
from urllib.parse import unquote, urlsplit

from mitmproxy import http, tcp, tls
from mitmproxy.proxy import server_hooks

egress = json.loads(os.environ["YAPIR_EGRESS"])
credentials = [
    (urlsplit(credential["url"]), credential["header"], credential["value"])
    for credential in egress["credentials"]
]
credential_hosts = {url.hostname for url, _, _ in credentials}
network_policy = egress["allowedHosts"] is not None
allowed_hosts = [*(egress["allowedHosts"] or []), *credential_hosts]


def allowed(host: str | None):
    if not network_policy:
        return True

    return bool(host) and any(
        host == pattern or (pattern.startswith("*.") and host.endswith(pattern[1:]))
        for pattern in allowed_hosts
    )


def log_denied(host: str):
    print(f"network policy denied {host}", flush=True)


def tls_clienthello(data: tls.ClientHelloData):
    host = data.client_hello.sni

    # Under a network policy, the proxy connects to the named host, not to the address that the agent chose.
    if network_policy and host:
        data.context.server.address = (host, data.context.server.address[1])

    if not allowed(host):
        # The proxy decrypts the request to refuse it with an explicit response.
        log_denied(host or data.context.server.address[0])
    elif host not in credential_hosts:
        data.ignore_connection = True


def requestheaders(flow: http.HTTPFlow):
    host = flow.request.pretty_host

    if not allowed(host):
        # The ClientHello already logged the refusal of a TLS connection to a refused host.
        if not flow.client_conn.tls or allowed(flow.client_conn.sni):
            log_denied(host)

        flow.response = http.Response.make(
            403,
            f"Yapir's network policy denied {host}. An Organization Admin can allow it in the network policy.\n",
            {"X-Yapir-Network-Policy": "denied"},
        )
        return

    # The proxy streams the bodies: buffering them would delay streamed responses, such as server-sent events.
    # mitmproxy refuses to stream a request that already has a response.
    flow.request.stream = True

    if network_policy:
        flow.request.host = host

    for url, header, value in credentials:
        if matches(url, flow):
            flow.request.headers[header] = value


def responseheaders(flow: http.HTTPFlow):
    flow.response.stream = True


# Under a network policy, the agent reaches only HTTP and TLS outside the job's networks.
# The TCP layer does not check a killed flow: the proxy refuses its server connection instead.
refused_clients = set()


def tcp_start(flow: tcp.TCPFlow):
    if network_policy:
        log_denied(flow.server_conn.address[0])
        refused_clients.add(flow.client_conn.id)


def server_connect(data: server_hooks.ServerConnectionHookData):
    if data.client.id in refused_clients:
        refused_clients.discard(data.client.id)
        data.server.error = "Yapir's network policy refuses TCP other than HTTP and TLS"


# The SNI binds the request to the host whose certificate the proxy verifies upstream.
def matches(url, flow: http.HTTPFlow):
    path = flow.request.path

    return (
        flow.client_conn.sni == url.hostname
        and flow.request.pretty_host == url.hostname
        and flow.request.port == (url.port or 443)
        and path.startswith(url.path)
        and ".." not in unquote(path).split("/")
    )
