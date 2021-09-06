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
import { Tracker, PeerContext } from "./tracker";
interface Settings {
    maxOffers: number;
    announceInterval: number;
}
export declare class FastTracker implements Tracker {
    #private;
    readonly settings: Settings;
    constructor(settings?: Partial<Settings>);
    get swarms(): ReadonlyMap<string, {
        peers: readonly PeerContext[];
    }>;
    processMessage(jsonObject: object, peer: PeerContext): void;
    disconnectPeer(peer: PeerContext): void;
    private processAnnounce;
    private addPeerToSwarm;
    private sendOffersToPeers;
    private processAnswer;
    private processStop;
    private processScrape;
}
export {};
