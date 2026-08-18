"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AXIOS_HTTP_METHODS = exports.INTERNAL_PARAMS_HEADER = exports.INTERNAL_TYPE_HEADER = exports.INTERNAL_REQUEST_HEADER = exports.DEFAULT_MAX_INTERNAL_HEADER_SIZE = exports.DEFAULT_MAX_FREE_SOCKETS = exports.DEFAULT_MAX_SOCKETS = exports.DEFAULT_FREE_SOCKET_TIMEOUT = exports.DEFAULT_KEEP_ALIVE_MSECS = exports.DEFAULT_KEEP_ALIVE = exports.DEFAULT_TIMEOUT = exports.DEFAULT_PROTOCOL = void 0;
exports.DEFAULT_PROTOCOL = 'http';
// 3.x: requests time out by default. Pass timeout: 0 explicitly to disable.
exports.DEFAULT_TIMEOUT = 5000;
// 3.x: connections are kept alive and reused across requests by default.
exports.DEFAULT_KEEP_ALIVE = true;
exports.DEFAULT_KEEP_ALIVE_MSECS = 1000;
// Must stay below the server's keepAliveTimeout (5000 ms in Node/Express), otherwise
// we risk ECONNRESET by writing into a connection the server is already closing.
exports.DEFAULT_FREE_SOCKET_TIMEOUT = 4000;
// No cap on concurrent sockets: time spent queued inside the agent is not covered by
// the axios timeout (that one only starts once a socket is assigned), so a capped
// pool would let requests hang indefinitely under load.
exports.DEFAULT_MAX_SOCKETS = Infinity;
exports.DEFAULT_MAX_FREE_SOCKETS = 256;
// Node allows 16 kB for the whole header block; stay well below it.
exports.DEFAULT_MAX_INTERNAL_HEADER_SIZE = 8192;
exports.INTERNAL_REQUEST_HEADER = 'X-Internal-Request';
exports.INTERNAL_TYPE_HEADER = 'X-Internal-Type';
exports.INTERNAL_PARAMS_HEADER = 'X-Internal-Params';
exports.AXIOS_HTTP_METHODS = {
    find: 'get',
    get: 'get',
    create: 'post',
    update: 'put',
    patch: 'patch',
    remove: 'delete'
};
