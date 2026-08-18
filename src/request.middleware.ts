import { Request, Response, NextFunction } from 'express';
import {
  INTERNAL_REQUEST_HEADER,
  INTERNAL_TYPE_HEADER,
  INTERNAL_PARAMS_HEADER,
  AXIOS_HTTP_METHODS,
} from './constants';

interface FeathersRequest {
  feathers?: any
}

interface Envelope {
  type: string;
  params: any;
  // Multipart requests carry their payload as the raw body, so it must be left for the
  // application's own upload middleware to parse.
  data?: any;
  multipart: boolean;
}

const decodeParamsHeader = (value: any): any => {
  if (typeof value !== 'string' || !value) { return {}; }

  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) || {};
  } catch (error) {
    return {};
  }
};

const readEnvelope = (req: Request): Envelope | null => {
  const typeHeader = req.headers[INTERNAL_TYPE_HEADER.toLowerCase()];

  if (typeof typeHeader === 'string' && typeHeader) {
    return {
      type: typeHeader,
      params: decodeParamsHeader(req.headers[INTERNAL_PARAMS_HEADER.toLowerCase()]),
      multipart: true,
    };
  }

  const body = req.body;

  if (!body || !body.__type) { return null; }

  return {
    type: body.__type,
    params: body.__params || {},
    data: body.__data,
    multipart: false,
  };
};

export const remoteRequestMiddleware = () => {
  return (req: Request & FeathersRequest, res: Response, next: NextFunction) => {
    const isInternalRequest = req.headers[INTERNAL_REQUEST_HEADER.toLowerCase()];

    if (!isInternalRequest) {
      return next();
    }

    const envelope = readEnvelope(req);

    if (!envelope) {
      return next();
    }

    const { type, params, data, multipart } = envelope;

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

    // Restore data for methods that use body. Multipart bodies are left untouched so the
    // application's upload middleware still sees an intact stream.
    if (!multipart) {
      if (data !== undefined) {
        req.body = data;
      } else {
        req.body = {};
      }
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
