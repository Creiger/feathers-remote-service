export declare class RemoteService {
    private readonly path;
    private requester;
    private remote;
    constructor(path: any, requester: any);
    find(params: any): Promise<any>;
    get(id: any, params: any): Promise<any>;
    create(data: any, params: any): Promise<any>;
    update(id: any, data: any, params: any): Promise<any>;
    patch(id: any, data: any, params: any): Promise<any>;
    remove(id: any, params: any): Promise<any>;
}
