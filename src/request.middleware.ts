import { Request, Response, NextFunction } from 'express';
import {
  INTERNAL_REQUEST_HEADER,
  AXIOS_HTTP_METHODS,
} from './constants';

interface FeathersRequest {
  feathers?: any
}

export const remoteRequestMiddleware = () => {
  return (req: Request & FeathersRequest, res: Response, next: NextFunction) => {
    const isInternalRequest = req.headers[INTERNAL_REQUEST_HEADER.toLowerCase()];

    if (!isInternalRequest) {
      return next();
    }

    const body = req.body;

    if (!body || !body.__type) {
      return next();
    }

    const type = body.__type;
    const params = body.__params || {};
    const data = body.__data;

    // Restore the original HTTP method so Feathers routes it correctly
    const originalMethod = AXIOS_HTTP_METHODS[type];
    if (originalMethod) {
      req.method = originalMethod.toUpperCase();
    }

    // Restore query params
    if (params.query) {
      req.query = params.query;
      delete params.query;
    }

    // Restore data for methods that use body
    if (data !== undefined) {
      req.body = data;
    } else {
      req.body = {};
    }

    // Set feathers params
    for (const key of Object.keys(params)) {
      if (req.feathers) {
        req.feathers[key] = params[key];
      }
    }
    delete req.feathers?.provider;
    delete req.feathers?.headers;

    next();
  };
};
