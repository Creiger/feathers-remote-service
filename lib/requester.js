"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Requester = exports.isFormData = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const errors_1 = __importDefault(require("@feathersjs/errors"));
const form_data_1 = __importDefault(require("form-data"));
const constants_1 = require("./constants");
/**
 * Detects a multipart payload. Covers the form-data package (including a duplicate
 * copy resolved elsewhere in node_modules) as well as the native FormData exposed
 * by Node 18+, which the form-data instanceof check would miss.
 */
function isFormData(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    if (value instanceof form_data_1.default) {
        return true;
    }
    if (typeof value.getHeaders === 'function' && typeof value.getBoundary === 'function') {
        return true;
    }
    const NativeFormData = globalThis.FormData;
    return typeof NativeFormData === 'function' && value instanceof NativeFormData;
}
exports.isFormData = isFormData;
class Requester {
    constructor(options) {
        this.protocol = options.protocol || constants_1.DEFAULT_PROTOCOL;
        this.host = options.host;
        this.port = options.port;
        this.dnsSuffix = options.dnsSuffix || '';
        this.pathToHost = options.pathToHost === true ? this.getHostByPath : options.pathToHost;
        this.timeout = options.timeout !== undefined ? options.timeout : constants_1.DEFAULT_TIMEOUT;
        this.proxy = options.proxy;
        this.excludeParams = options.excludeParams || ['headers', 'authentication', 'route', 'connection', 'provider', 'authorization', 'host', 'content-length', 'content-type'];
        this.maxRedirects = options.maxRedirects;
        this.keepAlive = options.keepAlive !== undefined ? options.keepAlive : constants_1.DEFAULT_KEEP_ALIVE;
        this.internalRequestHeader = options.internalRequestHeader || constants_1.INTERNAL_REQUEST_HEADER;
        this.responseType = options.responseType;
        this.maxInternalHeaderSize = options.maxInternalHeaderSize !== undefined ? options.maxInternalHeaderSize : constants_1.DEFAULT_MAX_INTERNAL_HEADER_SIZE;
        // Agents live for the lifetime of the requester; a per-request agent would never
        // reuse a connection, which is what made keepAlive a no-op in 2.x.
        this.ownsAgents = !options.httpAgent && !options.httpsAgent;
        const agentOptions = {
            keepAlive: this.keepAlive,
            keepAliveMsecs: options.keepAliveMsecs !== undefined ? options.keepAliveMsecs : constants_1.DEFAULT_KEEP_ALIVE_MSECS,
            maxSockets: options.maxSockets !== undefined ? options.maxSockets : constants_1.DEFAULT_MAX_SOCKETS,
            maxFreeSockets: options.maxFreeSockets !== undefined ? options.maxFreeSockets : constants_1.DEFAULT_MAX_FREE_SOCKETS,
            scheduling: 'lifo',
            // Only applies to sockets sitting in the free pool; Node leaves sockets that are
            // serving a request alone, so this never cuts a long-running call short.
            timeout: this.keepAlive
                ? (options.freeSocketTimeout !== undefined ? options.freeSocketTimeout : constants_1.DEFAULT_FREE_SOCKET_TIMEOUT)
                : undefined,
        };
        this.httpAgent = options.httpAgent || new http_1.default.Agent(agentOptions);
        this.httpsAgent = options.httpsAgent || new https_1.default.Agent(agentOptions);
        // Own axios instance: applying retry to the global one leaked interceptors into
        // every other axios call in the host application and stacked them per requester.
        this.axios = axios_1.default.create();
        if (options.retry) {
            axios_retry_1.default(this.axios, options.retry);
        }
    }
    async send(options) {
        const { type, path, id, data, params } = options;
        const serviceProtocol = params.protocol || this.protocol;
        const serviceHostPrefix = (params.host || this.host || (this.pathToHost && this.pathToHost(path)));
        const servicePort = params.port || this.port || this.getProtocolPort(serviceProtocol);
        this.validateProtocol(serviceProtocol);
        this.validateHost(serviceHostPrefix);
        this.validatePort(servicePort);
        const dnsSuffix = params.dnsSuffix !== undefined ? params.dnsSuffix : this.dnsSuffix;
        const serviceHost = serviceHostPrefix + dnsSuffix;
        const url = this.getUrl(serviceProtocol, serviceHost, servicePort, path, id);
        let proxy = {
            ...this.proxy,
            ...params.proxy
        };
        if (!Object.keys(proxy).length) {
            proxy = false;
        }
        const requestOptions = {
            proxy,
            headers: {
                ...this.filterParams(params.headers),
                [this.internalRequestHeader]: 'true',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            timeout: params.timeout !== undefined ? params.timeout : this.timeout,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            httpAgent: this.httpAgent,
            httpsAgent: this.httpsAgent,
        };
        const filteredParams = this.filterParams(params);
        let body;
        if (isFormData(data)) {
            // A multipart stream cannot be nested inside a JSON envelope, so the payload stays
            // the raw multipart body and the envelope moves into headers. The remote side then
            // parses it with its usual upload middleware.
            body = data;
            requestOptions.headers[constants_1.INTERNAL_TYPE_HEADER] = type;
            requestOptions.headers[constants_1.INTERNAL_PARAMS_HEADER] = this.encodeParamsHeader(filteredParams);
            if (typeof data.getHeaders === 'function') {
                requestOptions.headers = {
                    ...requestOptions.headers,
                    ...data.getHeaders(),
                };
            }
        }
        else {
            body = {
                __type: type,
                __params: filteredParams,
            };
            if (data !== undefined) {
                body.__data = data;
            }
        }
        if (this.responseType) {
            requestOptions.responseType = this.responseType;
        }
        if (this.maxRedirects !== undefined) {
            requestOptions.maxRedirects = this.maxRedirects;
        }
        const result = await this.axios.post(url, body, requestOptions);
        return result.data;
    }
    encodeParamsHeader(params) {
        const encoded = Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
        if (encoded.length > this.maxInternalHeaderSize) {
            throw new errors_1.default.BadRequest(`Params too large to send alongside a multipart body (${encoded.length} bytes, limit ${this.maxInternalHeaderSize}). ` +
                'Reduce the params or extend excludeParams.');
        }
        return encoded;
    }
    /**
     * Closes the pooled connections. Only affects agents this requester created; agents
     * passed in through options stay under the caller's control.
     */
    destroy() {
        if (!this.ownsAgents) {
            return;
        }
        this.httpAgent.destroy();
        this.httpsAgent.destroy();
    }
    validateProtocol(value) {
        if (value !== 'http' && value !== 'https') {
            throw new errors_1.default.BadRequest(`Invalid protocol ${value}`);
        }
    }
    validateHost(value) {
        if (!value) {
            throw new errors_1.default.BadRequest('Missing host');
        }
    }
    validatePort(value) {
        if (!(value > 0 && value <= 65535)) {
            throw new errors_1.default.BadRequest(`Invalid port ${value}`);
        }
    }
    getProtocolPort(protocol) {
        if (protocol === 'http') {
            return 80;
        }
        else if (protocol === 'https') {
            return 443;
        }
    }
    getHostByPath(path) {
        return path.replace(/[^a-z0-9]/gi, '-');
    }
    getUrl(protocol, host, port, path, id) {
        const fullPath = id ? `${path}/${this.idToString(id)}` : path;
        const isKnownPort = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443);
        let url = `${protocol}://${host}`;
        if (!isKnownPort) {
            url += `:${port}`;
        }
        url += `/${fullPath}`;
        return url;
    }
    filterParams(params) {
        if (!this.excludeParams) {
            return params;
        }
        const result = { ...params };
        for (const param of this.excludeParams) {
            delete result[param];
        }
        return result;
    }
    idToString(id) {
        if (typeof id === 'object') {
            return id.toString();
        }
        return id;
    }
}
exports.Requester = Requester;
