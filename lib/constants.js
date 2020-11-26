"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AXIOS_HTTP_METHODS = exports.INTERNAL_REQUEST_HEADER = exports.DEFAULT_TIMEOUT = exports.DEFAULT_PROTOCOL = void 0;
exports.DEFAULT_PROTOCOL = 'http';
exports.DEFAULT_TIMEOUT = 0;
exports.INTERNAL_REQUEST_HEADER = 'X-Internal-Request';
exports.AXIOS_HTTP_METHODS = {
    find: 'get',
    get: 'get',
    create: 'post',
    update: 'put',
    patch: 'patch',
    remove: 'delete'
};
