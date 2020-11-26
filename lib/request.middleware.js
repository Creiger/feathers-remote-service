"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteRequestMiddleware = void 0;
const constants_1 = require("./constants");
const remoteRequestMiddleware = () => {
    return (req, res, next) => {
        var _a, _b;
        const requestHeader = req.headers[constants_1.INTERNAL_REQUEST_HEADER.toLowerCase()];
        if (requestHeader && typeof requestHeader === 'string') {
            const params = JSON.parse(decodeURI(requestHeader));
            req.query = params.query;
            delete params.query;
            for (const key of Object.keys(params)) {
                if (req.feathers) {
                    req.feathers[key] = params[key];
                }
            }
            (_a = req.feathers) === null || _a === void 0 ? true : delete _a.provider;
            (_b = req.feathers) === null || _b === void 0 ? true : delete _b.headers;
        }
        next();
    };
};
exports.remoteRequestMiddleware = remoteRequestMiddleware;
