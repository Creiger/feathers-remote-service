"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteRequestMiddleware = void 0;
const constants_1 = require("./constants");
const decodeParamsHeader = (value) => {
    if (typeof value !== 'string' || !value) {
        return {};
    }
    try {
        return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) || {};
    }
    catch (error) {
        return {};
    }
};
const readEnvelope = (req) => {
    const typeHeader = req.headers[constants_1.INTERNAL_TYPE_HEADER.toLowerCase()];
    if (typeof typeHeader === 'string' && typeHeader) {
        return {
            type: typeHeader,
            params: decodeParamsHeader(req.headers[constants_1.INTERNAL_PARAMS_HEADER.toLowerCase()]),
            multipart: true,
        };
    }
    const body = req.body;
    if (!body || !body.__type) {
        return null;
    }
    return {
        type: body.__type,
        params: body.__params || {},
        data: body.__data,
        multipart: false,
    };
};
const remoteRequestMiddleware = () => {
    return (req, res, next) => {
        var _a, _b;
        const isInternalRequest = req.headers[constants_1.INTERNAL_REQUEST_HEADER.toLowerCase()];
        if (!isInternalRequest) {
            return next();
        }
        const envelope = readEnvelope(req);
        if (!envelope) {
            return next();
        }
        const { type, params, data, multipart } = envelope;
        // Restore the original HTTP method so Feathers routes it correctly
        const originalMethod = constants_1.AXIOS_HTTP_METHODS[type];
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
            }
            else {
                req.body = {};
            }
        }
        // Set feathers params
        for (const key of Object.keys(params)) {
            if (req.feathers) {
                req.feathers[key] = params[key];
            }
        }
        (_a = req.feathers) === null || _a === void 0 ? true : delete _a.provider;
        (_b = req.feathers) === null || _b === void 0 ? true : delete _b.headers;
        next();
    };
};
exports.remoteRequestMiddleware = remoteRequestMiddleware;
