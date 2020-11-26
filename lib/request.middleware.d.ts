import { Request, Response, NextFunction } from 'express';
interface FeathersRequest {
    feathers?: any;
}
export declare const remoteRequestMiddleware: () => (req: Request & FeathersRequest, res: Response, next: NextFunction) => void;
export {};
