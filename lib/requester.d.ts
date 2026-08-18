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
/**
 * Detects a multipart payload. Covers the form-data package (including a duplicate
 * copy resolved elsewhere in node_modules) as well as the native FormData exposed
 * by Node 18+, which the form-data instanceof check would miss.
 */
export declare function isFormData(value: any): boolean;
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
    private readonly maxInternalHeaderSize;
    private readonly httpAgent;
    private readonly httpsAgent;
    private readonly ownsAgents;
    private readonly axios;
    constructor(options: any);
    send(options: any): Promise<any>;
    encodeParamsHeader(params: any): string;
    /**
     * Closes the pooled connections. Only affects agents this requester created; agents
     * passed in through options stay under the caller's control.
     */
    destroy(): void;
    validateProtocol(value: any): void;
    validateHost(value: any): void;
    validatePort(value: any): void;
    getProtocolPort(protocol: any): 80 | 443 | undefined;
    getHostByPath(path: any): any;
    getUrl(protocol: any, host: any, port: any, path: any, id: any): string;
    filterParams(params: any): any;
    idToString(id: any): any;
}
