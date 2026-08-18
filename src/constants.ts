export const DEFAULT_PROTOCOL = 'http';

// 3.x: requests time out by default. Pass timeout: 0 explicitly to disable.
export const DEFAULT_TIMEOUT = 5000;

// 3.x: connections are kept alive and reused across requests by default.
export const DEFAULT_KEEP_ALIVE = true;
export const DEFAULT_KEEP_ALIVE_MSECS = 1000;

// Must stay below the server's keepAliveTimeout (5000 ms in Node/Express), otherwise
// we risk ECONNRESET by writing into a connection the server is already closing.
export const DEFAULT_FREE_SOCKET_TIMEOUT = 4000;

// No cap on concurrent sockets: time spent queued inside the agent is not covered by
// the axios timeout (that one only starts once a socket is assigned), so a capped
// pool would let requests hang indefinitely under load.
export const DEFAULT_MAX_SOCKETS = Infinity;
export const DEFAULT_MAX_FREE_SOCKETS = 256;

// Node allows 16 kB for the whole header block; stay well below it.
export const DEFAULT_MAX_INTERNAL_HEADER_SIZE = 8192;

export const INTERNAL_REQUEST_HEADER = 'X-Internal-Request';
export const INTERNAL_TYPE_HEADER = 'X-Internal-Type';
export const INTERNAL_PARAMS_HEADER = 'X-Internal-Params';

export const AXIOS_HTTP_METHODS = {
  find: 'get',
  get: 'get',
  create: 'post',
  update: 'put',
  patch: 'patch',
  remove: 'delete'
};
