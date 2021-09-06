"use strict";
/**
 * Copyright 2019 Novage LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _app;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UWebSocketsTracker = void 0;
const string_decoder_1 = require("string_decoder");
const uWebSockets_js_1 = require("uWebSockets.js");
const Debug = require("debug");
const tracker_1 = require("./tracker");
// eslint-disable-next-line new-cap
const debugWebSockets = Debug("wt-tracker:uws-tracker");
const debugWebSocketsEnabled = debugWebSockets.enabled;
// eslint-disable-next-line new-cap
const debugMessages = Debug("wt-tracker:uws-tracker-messages");
const debugMessagesEnabled = debugMessages.enabled;
// eslint-disable-next-line new-cap
const debugRequests = Debug("wt-tracker:uws-tracker-requests");
const debugRequestsEnabled = debugRequests.enabled;
const decoder = new string_decoder_1.StringDecoder();
class UWebSocketsTracker {
    constructor(tracker, settings) {
        this.tracker = tracker;
        // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
        _app.set(this, void 0);
        this.webSocketsCount = 0;
        this.validateOrigin = false;
        this.onOpen = (ws, request) => {
            var _a, _b;
            this.webSocketsCount++;
            if ((this.maxConnections !== 0) && (this.webSocketsCount > this.maxConnections)) {
                if (debugRequestsEnabled) {
                    debugRequests(this.settings.server.host, this.settings.server.port, "ws-denied-max-connections url:", request.getUrl(), "query:", request.getQuery(), "origin:", request.getHeader("origin"), "total:", this.webSocketsCount);
                }
                ws.close();
                return;
            }
            if (debugWebSocketsEnabled) {
                debugWebSockets("connected via URL", request.getUrl());
            }
            if (this.validateOrigin) {
                const origin = request.getHeader("origin");
                const shoulDeny = ((this.settings.access.denyEmptyOrigin && (origin.length === 0))
                    || (((_a = this.settings.access.denyOrigins) === null || _a === void 0 ? void 0 : _a.includes(origin)) === true)
                    || (((_b = this.settings.access.allowOrigins) === null || _b === void 0 ? void 0 : _b.includes(origin)) === false));
                if (shoulDeny) {
                    if (debugRequestsEnabled) {
                        debugRequests(this.settings.server.host, this.settings.server.port, "ws-denied url:", request.getUrl(), "query:", request.getQuery(), "origin:", origin, "total:", this.webSocketsCount);
                    }
                    ws.close();
                    return;
                }
            }
            if (debugRequestsEnabled) {
                debugRequests(this.settings.server.host, this.settings.server.port, "ws-open url:", request.getUrl(), "query:", request.getQuery(), "origin:", request.getHeader("origin"), "total:", this.webSocketsCount);
            }
        };
        this.onMessage = (ws, message) => {
            debugWebSockets("message of size", message.byteLength);
            let json = undefined;
            try {
                json = JSON.parse(decoder.end(new Uint8Array(message)));
            }
            catch (e) {
                debugWebSockets("failed to parse JSON message", e);
                ws.close();
                return;
            }
            if (ws.sendMessage === undefined) {
                ws.sendMessage = sendMessage;
            }
            if (debugMessagesEnabled) {
                debugMessages("in", (ws.id === undefined) ? "unknown peer" : Buffer.from(ws.id).toString("hex"), json);
            }
            try {
                this.tracker.processMessage(json, ws);
            }
            catch (e) {
                if (e instanceof tracker_1.TrackerError) {
                    debugWebSockets("failed to process message from the peer:", e);
                    ws.close();
                }
                else {
                    throw e;
                }
            }
        };
        this.onClose = (ws, code) => {
            this.webSocketsCount--;
            if (ws.sendMessage !== undefined) {
                this.tracker.disconnectPeer(ws);
            }
            debugWebSockets("closed with code", code);
        };
        this.settings = {
            server: Object.assign({ port: 8000, host: "0.0.0.0" }, settings.server),
            websockets: Object.assign({ path: "/*", maxPayloadLength: 64 * 1024, idleTimeout: 240, compression: 1, maxConnections: 0 }, settings.websockets),
            access: Object.assign({ allowOrigins: undefined, denyOrigins: undefined, denyEmptyOrigin: false }, settings.access),
        };
        this.maxConnections = this.settings.websockets.maxConnections;
        this.validateAccess();
        __classPrivateFieldSet(this, _app, (this.settings.server.key_file_name === undefined)
            // eslint-disable-next-line new-cap
            ? uWebSockets_js_1.App(this.settings.server)
            // eslint-disable-next-line new-cap
            : uWebSockets_js_1.SSLApp(this.settings.server));
        this.buildApplication();
    }
    get app() {
        return __classPrivateFieldGet(this, _app);
    }
    get stats() {
        return {
            webSocketsCount: this.webSocketsCount,
        };
    }
    async run() {
        await new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _app).listen(this.settings.server.host, this.settings.server.port, (token) => {
                if (token === false) {
                    reject(new Error(`failed to listen to ${this.settings.server.host}:${this.settings.server.port}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    validateAccess() {
        if (this.settings.access.allowOrigins !== undefined) {
            if (this.settings.access.denyOrigins !== undefined) {
                throw new Error("allowOrigins and denyOrigins can't be set simultaneously");
            }
            else if (!(this.settings.access.allowOrigins instanceof Array)) {
                throw new Error("allowOrigins configuration paramenters should be an array of strings");
            }
        }
        else if ((this.settings.access.denyOrigins !== undefined) && !(this.settings.access.denyOrigins instanceof Array)) {
            throw new Error("denyOrigins configuration paramenters should be an array of strings");
        }
        const origins = (this.settings.access.allowOrigins === undefined
            ? this.settings.access.denyOrigins
            : this.settings.access.allowOrigins);
        if (origins !== undefined) {
            for (const origin of origins) {
                if (typeof origin !== "string") {
                    throw new Error("allowOrigins and denyOrigins configuration paramenters should be arrays of strings");
                }
            }
        }
        this.validateOrigin = (this.settings.access.denyEmptyOrigin
            || (this.settings.access.allowOrigins !== undefined)
            || (this.settings.access.denyOrigins !== undefined));
    }
    buildApplication() {
        __classPrivateFieldGet(this, _app).ws(this.settings.websockets.path, {
            compression: this.settings.websockets.compression,
            maxPayloadLength: this.settings.websockets.maxPayloadLength,
            idleTimeout: this.settings.websockets.idleTimeout,
            open: this.onOpen,
            drain: (ws) => {
                if (debugWebSocketsEnabled) {
                    debugWebSockets("drain", ws.getBufferedAmount());
                }
            },
            message: this.onMessage,
            close: this.onClose,
        });
    }
}
exports.UWebSocketsTracker = UWebSocketsTracker;
_app = new WeakMap();
function sendMessage(json, ws) {
    ws.send(JSON.stringify(json), false, false);
    if (debugMessagesEnabled) {
        debugMessages("out", (ws.id === undefined) ? "unknown peer" : Buffer.from(ws.id).toString("hex"), json);
    }
}
