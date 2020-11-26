import http from 'http';
import https from 'https';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import errors from '@feathersjs/errors';
import FormData from 'form-data';
import {
  DEFAULT_PROTOCOL,
  DEFAULT_TIMEOUT,
  INTERNAL_REQUEST_HEADER,
  AXIOS_HTTP_METHODS
} from './constants';

export interface IRequestOptions {
  maxRedirects?: any;
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
      },
      timeout: params.timeout !== undefined ? params.timeout : this.timeout
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

    if (this.keepAlive) {
      requestOptions.httpAgent = new http.Agent({keepAlive: true});
      requestOptions.httpsAgent = new https.Agent({keepAlive: true});
    }
    const httpMethod = AXIOS_HTTP_METHODS[type];
    const args = data ? [url, data, requestOptions] : [url, requestOptions];
    const result = await axios[httpMethod](...args);

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
