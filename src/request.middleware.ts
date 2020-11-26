import { Request, Response, NextFunction } from 'express';
import {
  INTERNAL_REQUEST_HEADER,
} from './constants';

interface FeathersRequest {
  feathers?: any
}

export default () => {
  return (req: Request & FeathersRequest, res: Response, next: NextFunction) => {
    const requestHeader = req.headers[INTERNAL_REQUEST_HEADER.toLowerCase()];
    if (requestHeader && typeof requestHeader === 'string') {
      const params = JSON.parse(decodeURI(requestHeader));
      req.query = params.query;
      delete params.query;
      for (const key of Object.keys(params)) {
        if (req.feathers) {
          req.feathers[key] = params[key];
        }
      }
      delete req.feathers?.provider;
      delete req.feathers?.headers;
    }
    next();
  };
};
