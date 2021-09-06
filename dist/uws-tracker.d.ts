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
import { TemplatedApp } from "uWebSockets.js";
import { Tracker } from "./tracker";
import { ServerSettings, WebSocketsSettings, WebSocketsAccessSettings } from "./run-uws-tracker";
export interface UwsTrackerSettings {
    server: ServerSettings;
    websockets: WebSocketsSettings;
    access: WebSocketsAccessSettings;
}
export interface PartialUwsTrackerSettings {
    server?: Partial<ServerSettings>;
    websockets?: Partial<WebSocketsSettings>;
    access?: Partial<WebSocketsAccessSettings>;
}
export declare class UWebSocketsTracker {
    #private;
    readonly tracker: Readonly<Tracker>;
    readonly settings: UwsTrackerSettings;
    private webSocketsCount;
    private validateOrigin;
    private readonly maxConnections;
    get app(): TemplatedApp;
    get stats(): {
        webSocketsCount: number;
    };
    constructor(tracker: Readonly<Tracker>, settings: PartialUwsTrackerSettings);
    run(): Promise<void>;
    private validateAccess;
    private buildApplication;
    private readonly onOpen;
    private readonly onMessage;
    private readonly onClose;
}
