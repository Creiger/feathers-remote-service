"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Requester = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const errors_1 = __importDefault(require("@feathersjs/errors"));
const form_data_1 = __importDefault(require("form-data"));
const axios_cached_dns_resolve_1 = require("axios-cached-dns-resolve");
const constants_1 = require("./constants");
const dnsCacheConfig = {
    disabled: process.env.AXIOS_DNS_DISABLE === 'true',
    dnsTtlMs: process.env.AXIOS_DNS_CACHE_TTL_MS || 5000,
    cacheGraceExpireMultiplier: process.env.AXIOS_DNS_CACHE_EXPIRE_MULTIPLIER || 2,
    dnsIdleTtlMs: process.env.AXIOS_DNS_CACHE_IDLE_TTL_MS || 1000 * 60 * 60,
    backgroundScanMs: process.env.AXIOS_DNS_BACKGROUND_SCAN_MS || 2400,
    dnsCacheSize: process.env.AXIOS_DNS_CACHE_SIZE || 100,
    // pino logging options
    logging: {
        name: 'axios-cache-dns-resolve',
        // enabled: true,
        level: process.env.AXIOS_DNS_LOG_LEVEL || 'info',
        // timestamp: true,
        prettyPrint: process.env.NODE_ENV === 'DEBUG' || false,
        useLevelLabels: true,
    },
};
class Requester {
    constructor(options) {
        this.protocol = options.protocol || constants_1.DEFAULT_PROTOCOL;
        this.host = options.host;
        this.port = options.port;
        this.dnsSuffix = options.dnsSuffix || '';
        this.pathToHost = options.pathToHost === true ? this.getHostByPath : options.pathToHost;
        this.timeout = options.timeout || constants_1.DEFAULT_TIMEOUT;
        this.proxy = options.proxy;
        this.excludeParams = options.excludeParams || ['headers', 'authentication', 'route', 'connection', 'provider', 'authorization', 'host', 'content-length'];
        this.maxRedirects = options.maxRedirects;
        this.keepAlive = options.keepAlive;
        this.internalRequestHeader = options.internalRequestHeader || constants_1.INTERNAL_REQUEST_HEADER;
        this.responseType = options.responseType;
        if (options.retry) {
            axios_retry_1.default(axios_1.default, options.retry);
        }
        this.axiosClient = axios_1.default.create();
        if (options.dnsCache) {
            // @ts-ignore
            this.axiosClient = axios_1.default.create(dnsCacheConfig);
            axios_cached_dns_resolve_1.registerInterceptor(this.axiosClient);
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
                [this.internalRequestHeader]: encodeURI(JSON.stringify(this.filterParams(params))),
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            timeout: params.timeout !== undefined ? params.timeout : this.timeout,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        };
        if (data instanceof form_data_1.default) {
            requestOptions.headers = data.getHeaders();
        }
        if (this.responseType) {
            requestOptions.responseType = this.responseType;
        }
        if (this.maxRedirects !== undefined) {
            requestOptions.maxRedirects = this.maxRedirects;
        }
        requestOptions.httpAgent = new http_1.default.Agent({
            keepAlive: this.keepAlive
        });
        requestOptions.httpsAgent = new https_1.default.Agent({
            keepAlive: this.keepAlive
        });
        const httpMethod = constants_1.AXIOS_HTTP_METHODS[type];
        const args = data ? [url, data, requestOptions] : [url, requestOptions];
        const result = await this.axiosClient[httpMethod](...args);
        return result.data;
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
