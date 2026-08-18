# feathers-remote-service

Package for skimming a remote service as local.

## Usage

```js
const { Requester, RemoteService, remoteRequestMiddleware } = require('feathers-remote-service');

// Client side — one requester per application, shared by all remote services.
const requester = new Requester({
  host: 'my-service',
  port: 3030,
  timeout: 5000,
});

app.use('messages', new RemoteService('messages', requester));

// Server side — after the JSON body parser, before any multipart parser.
app.use(express.json());
app.use(remoteRequestMiddleware());
// app.use(multer(...))
```

### Where to register the middleware

It has to sit **after** `express.json()`: the envelope of a normal call arrives in the
request body, so the middleware needs `req.body` already parsed — registered any earlier,
it finds nothing and every remote call falls through unprocessed.

It has to sit **before** any multipart parser: on those requests the envelope travels in
headers and the middleware deliberately leaves `req.body` alone, so the stream reaches
`multer` (or whatever you use) intact.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `protocol` | `'http'` | `http` or `https`. |
| `host`, `port` | — | Target service. Overridable per call through `params`. |
| `dnsSuffix` | `''` | Appended to the resolved host. |
| `pathToHost` | — | `true` derives the host from the service path, or pass your own function. |
| `timeout` | `5000` | Per-request timeout in ms. `0` disables it. |
| `keepAlive` | `true` | Reuse connections between requests. |
| `keepAliveMsecs` | `1000` | TCP keep-alive probe delay. |
| `freeSocketTimeout` | `4000` | Idle timeout for pooled connections. Keep it below the remote server's `keepAliveTimeout`. |
| `maxSockets` | `Infinity` | Concurrent sockets per host. |
| `maxFreeSockets` | `256` | Idle sockets kept per host. |
| `httpAgent`, `httpsAgent` | — | Supply your own agents; the options above are then ignored and `destroy()` leaves them alone. |
| `retry` | — | Passed to `axios-retry`, scoped to this requester's own axios instance. |
| `proxy` | — | Axios proxy config. |
| `excludeParams` | see source | Params stripped before they are sent. |
| `maxInternalHeaderSize` | `8192` | Cap for the params header on multipart requests. |

Call `requester.destroy()` on shutdown to close pooled connections.

## Upgrading from 2.x

Four breaking changes:

**1. Requests now time out.** `DEFAULT_TIMEOUT` went from `0` (wait forever) to `5000` ms. Any call that stays silent for longer — long reports, bulk imports, slow third-party calls — now fails with a `GatewayTimeout` (504). Audit your slow endpoints and either raise `timeout` globally, pass `params.timeout` per call, or set `timeout: 0` to keep 2.x behaviour.

**2. `timeout: 0` means "no timeout" again.** In 2.x the option went through `options.timeout || DEFAULT_TIMEOUT`, so `0` was indistinguishable from unset. It is now checked against `undefined`, which makes `0` a real value.

**3. Keep-alive is on by default and actually works.** 2.x built a fresh `http.Agent` on every request, so `keepAlive` had nothing to reuse and was effectively always off. Agents are now created once per requester. Two consequences worth planning for:

- Connections stick to whichever backend they landed on. Behind an L4 load balancer (a Kubernetes `Service`, for example) traffic no longer rebalances per request, so freshly scaled-up pods stay cold until connections recycle. `freeSocketTimeout` bounds how long that lasts.
- `freeSocketTimeout` must stay below the remote server's `keepAliveTimeout` (5000 ms in Node and Express). If it does not, the client can write into a connection the server is already closing and see sporadic `ECONNRESET`.

Set `keepAlive: false` to keep 2.x behaviour.

**4. `retry` no longer patches the global axios.** 2.x called `axiosRetry(axios, ...)` on the module-level instance, which applied the retry policy to every other axios call in the host application and stacked interceptors once per requester. Each requester now owns its axios instance. If you were relying on that leak, apply `axios-retry` yourself.

### Multipart requests

`FormData` payloads used to be nested inside the JSON envelope, where they serialised to an empty object — the branch never worked. A multipart body is now sent as the raw request body, and the envelope (`__type`, `__params`) moves into the `X-Internal-Type` and `X-Internal-Params` headers instead, so `remoteRequestMiddleware` leaves the stream intact for your upload middleware to parse.

Because the params travel in a header on these requests, they are capped by `maxInternalHeaderSize` (8 kB, against Node's 16 kB header limit); exceeding it throws a `BadRequest` rather than failing obscurely at the remote end. Both the `form-data` package and Node's native `FormData` are recognised.

This changes the wire format, so multipart calls need 3.x on **both** ends: a 2.x `remoteRequestMiddleware` looks for the envelope in the body, finds nothing, and passes the request through unprocessed. The JSON path is unchanged and stays compatible in both directions.
