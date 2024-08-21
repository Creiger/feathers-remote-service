import http from 'http';
import https from 'https';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import errors from '@feathersjs/errors';
import FormData from 'form-data';
import { registerInterceptor } from 'axios-cached-dns-resolve'
import {
  DEFAULT_PROTOCOL,
  DEFAULT_TIMEOUT,
  INTERNAL_REQUEST_HEADER,
  AXIOS_HTTP_METHODS
} from './constants';

const dnsCacheConfig = {
  disabled: process.env.AXIOS_DNS_DISABLE === 'true',
  dnsTtlMs: process.env.AXIOS_DNS_CACHE_TTL_MS || 5000, // when to refresh actively used dns entries (5 sec)
  cacheGraceExpireMultiplier: process.env.AXIOS_DNS_CACHE_EXPIRE_MULTIPLIER || 2, // maximum grace to use entry beyond TTL
  dnsIdleTtlMs: process.env.AXIOS_DNS_CACHE_IDLE_TTL_MS || 1000 * 60 * 60, // when to remove entry entirely if not being used (1 hour)
  backgroundScanMs: process.env.AXIOS_DNS_BACKGROUND_SCAN_MS || 2400, // how frequently to scan for expired TTL and refresh (2.4 sec)
  dnsCacheSize: process.env.AXIOS_DNS_CACHE_SIZE || 100, // maximum number of entries to keep in cache
  // pino logging options
  logging: {
    name: 'axios-cache-dns-resolve',
    // enabled: true,
    level: process.env.AXIOS_DNS_LOG_LEVEL || 'info', // default 'info' others trace, debug, info, warn, error, and fatal
    // timestamp: true,
    prettyPrint: process.env.NODE_ENV === 'DEBUG' || false,
    useLevelLabels: true,
  },
}

export interface IRequestOptions {
  maxRedirects?: any;
  maxContentLength?: any;
  maxBodyLength?: any;
  httpAgent?: any;
  httpsAgent?: any;
  params?: any;
  responseType?: any;
  proxy: any;
  headers: any;
  timeout: any;
}

export class Requester {
  private readonly protocol: any;
  private readonly host: any;
  private readonly port: any;
  private readonly dnsSuffix: any;
  private readonly pathToHost: any;
  private readonly timeout: any;
  private readonly proxy: any;
  private readonly maxRedirects: any;
  private readonly excludeParams: any;
  private readonly keepAlive: any;
  private readonly internalRequestHeader: any;
  private readonly responseType: any;
  private readonly axiosClient: any;


  constructor (options) {
    this.protocol = options.protocol || DEFAULT_PROTOCOL;
    this.host = options.host;
    this.port = options.port;
    this.dnsSuffix = options.dnsSuffix || '';
    this.pathToHost = options.pathToHost === true ? this.getHostByPath : options.pathToHost;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.proxy = options.proxy;
    this.excludeParams = options.excludeParams || ['headers', 'authentication', 'route', 'connection', 'provider', 'authorization', 'host', 'content-length'];
    this.maxRedirects = options.maxRedirects;
    this.keepAlive = options.keepAlive;
    this.internalRequestHeader = options.internalRequestHeader || INTERNAL_REQUEST_HEADER;
    this.responseType = options.responseType;

    if (options.retry) { axiosRetry(axios, options.retry); }
    this.axiosClient = axios.create();
    if (options.dnsCache) {
      // @ts-ignore
      this.axiosClient = axios.create(dnsCacheConfig);
      registerInterceptor(this.axiosClient);
    }
  }

  async send (options) {
    const {type, path, id, data, params} = options;
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
    const requestOptions: IRequestOptions = {
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
    if (data instanceof FormData) {
      requestOptions.headers = data.getHeaders();
    }
    if (this.responseType) {
      requestOptions.responseType = this.responseType;
    }
    if (this.maxRedirects !== undefined) {
      requestOptions.maxRedirects = this.maxRedirects;
    }
    requestOptions.httpAgent = new http.Agent({
      keepAlive: this.keepAlive
    });
    requestOptions.httpsAgent = new https.Agent({
      keepAlive: this.keepAlive
    });
    const httpMethod = AXIOS_HTTP_METHODS[type];
    const args = data ? [url, data, requestOptions] : [url, requestOptions];
    const result = await this.axiosClient[httpMethod](...args);

    return result.data;
  }

  validateProtocol (value) {
    if (value !== 'http' && value !== 'https') { throw new errors.BadRequest(`Invalid protocol ${value}`); }
  }

  validateHost (value) {
    if (!value) { throw new errors.BadRequest('Missing host'); }
  }

  validatePort (value) {
    if (!(value > 0 && value <= 65535)) { throw new errors.BadRequest(`Invalid port ${value}`); }
  }

  getProtocolPort (protocol) {
    if (protocol === 'http') { return 80; } else if (protocol === 'https') { return 443; }
  }

  getHostByPath (path) {
    return path.replace(/[^a-z0-9]/gi, '-');
  }

  getUrl (protocol, host, port, path, id) {
    const fullPath = id ? `${path}/${this.idToString(id)}` : path;
    const isKnownPort = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443);
    let url = `${protocol}://${host}`;

    if (!isKnownPort) { url += `:${port}`; }

    url += `/${fullPath}`;

    return url;
  }

  filterParams (params) {
    if (!this.excludeParams) { return params; }

    const result = { ...params };

    for (const param of this.excludeParams) { delete result[param]; }

    return result;
  }

  idToString (id) {
    if (typeof id === 'object') { return id.toString(); }

    return id;
  }
}
