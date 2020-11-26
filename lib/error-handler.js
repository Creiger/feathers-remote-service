"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = __importDefault(require("@feathersjs/errors"));
const errors_2 = require("@feathersjs/errors");
const errorHandler = function (error) {
    const err = error.response ? error.response.data || error.response : error;
    let feathersError;
    if (error.response) {
        if (err.status === 404) {
            feathersError = new errors_1.default.NotFound(err);
        }
    }
    else if (err.code) {
        if (err.code === 'ECONNABORTED') {
            feathersError = new errors_1.default.FeathersError(err, 'GatewayTimeout', 504, 'gateway-timeout', null);
        }
    }
    else {
        feathersError = new errors_1.default.BadGateway(err);
    }
    if (!feathersError) {
        feathersError = errors_2.convert(err);
    }
    delete feathersError.isAxiosError;
    delete feathersError.config;
    return feathersError;
};
exports.errorHandler = errorHandler;
