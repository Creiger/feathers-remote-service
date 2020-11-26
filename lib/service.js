"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteService = void 0;
const debug_1 = __importDefault(require("debug"));
const error_handler_1 = require("./error-handler");
const debug = debug_1.default('feathers-http-distributed:service');
class RemoteService {
    constructor(path, requester) {
        this.path = path;
        this.requester = requester;
        this.remote = true;
    }
    async find(params) {
        debug('Requesting find() remote service on path ' + this.path, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'find', path: this.path, params });
            debug('Successfully find() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
    async get(id, params) {
        debug('Requesting get() remote service on path ' + this.path, id, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'get', path: this.path, id, params });
            debug('Successfully get() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
    async create(data, params) {
        debug('Requesting create() remote service on path ' + this.path, data, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'create', path: this.path, data, params });
            debug('Successfully create() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
    async update(id, data, params) {
        debug('Requesting update() remote service on path ' + this.path, id, data, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'update', path: this.path, id, data, params });
            debug('Successfully update() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
    async patch(id, data, params) {
        debug('Requesting patch() remote service on path ' + this.path, id, data, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'patch', path: this.path, id, data, params });
            debug('Successfully patch() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
    async remove(id, params) {
        debug('Requesting remove() remote service on path ' + this.path, id, this.requester.filterParams(params));
        try {
            const result = await this.requester.send({ type: 'remove', path: this.path, id, params });
            debug('Successfully remove() remote service on path ' + this.path);
            return result;
        }
        catch (error) {
            throw error_handler_1.errorHandler(error);
        }
    }
}
exports.RemoteService = RemoteService;
