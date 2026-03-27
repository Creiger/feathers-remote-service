"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteRequestMiddleware = void 0;
const constants_1 = require("./constants");
const remoteRequestMiddleware = () => {
    return (req, res, next) => {
        var _a, _b;
        const isInternalRequest = req.headers[constants_1.INTERNAL_REQUEST_HEADER.toLowerCase()];
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
        const originalMethod = constants_1.AXIOS_HTTP_METHODS[type];
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
        }
        else {
            req.body = {};
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
