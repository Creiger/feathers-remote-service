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
export declare class Requester {
    private readonly protocol;
    private readonly host;
    private readonly port;
    private readonly dnsSuffix;
    private readonly pathToHost;
    private readonly timeout;
    private readonly proxy;
    private readonly maxRedirects;
    private readonly excludeParams;
    private readonly keepAlive;
    private readonly internalRequestHeader;
    private readonly responseType;
    private readonly axiosClient;
    constructor(options: any);
    send(options: any): Promise<any>;
    validateProtocol(value: any): void;
    validateHost(value: any): void;
    validatePort(value: any): void;
    getProtocolPort(protocol: any): 80 | 443 | undefined;
    getHostByPath(path: any): any;
    getUrl(protocol: any, host: any, port: any, path: any, id: any): string;
    filterParams(params: any): any;
    idToString(id: any): any;
}
