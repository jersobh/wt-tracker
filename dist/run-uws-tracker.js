"use strict";
/* eslint-disable no-console */
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
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const Debug = require("debug");
const os = require("os-utils");
const uws_tracker_1 = require("./uws-tracker");
const fast_tracker_1 = require("./fast-tracker");
// eslint-disable-next-line new-cap
const debugRequests = Debug("wt-tracker:uws-tracker-requests");
const debugRequestsEnabled = debugRequests.enabled;
async function main() {
    let settingsFileData = undefined;
    if (process.argv.length <= 2) {
        try {
            settingsFileData = fs_1.readFileSync("config.json");
        }
        catch (e) {
            if (e.code !== "ENOENT") {
                console.error("failed to read configuration file:", e);
                return;
            }
        }
    }
    else {
        try {
            settingsFileData = fs_1.readFileSync(process.argv[2]);
        }
        catch (e) {
            console.error("failed to read configuration file:", e);
            return;
        }
    }
    let jsonSettings = undefined;
    try {
        jsonSettings = (settingsFileData === undefined)
            ? {}
            : JSON.parse(settingsFileData.toString());
    }
    catch (e) {
        console.error("failed to parse JSON configuration file:", e);
        return;
    }
    const settings = validateSettings(jsonSettings);
    if (settings === undefined) {
        return;
    }
    const tracker = new fast_tracker_1.FastTracker(settings.tracker);
    try {
        await runServers(tracker, settings);
    }
    catch (e) {
        console.error("failed to start the web server:", e);
    }
}
function validateSettings(jsonSettings) {
    if ((jsonSettings.servers !== undefined) && !(jsonSettings.servers instanceof Array)) {
        console.error("failed to parse JSON configuration file: 'servers' property should be an array");
        return undefined;
    }
    const servers = [];
    if (jsonSettings.servers === undefined) {
        servers.push({});
    }
    else {
        for (const serverSettings of jsonSettings.servers) {
            if (serverSettings instanceof Object) {
                servers.push(serverSettings);
            }
            else {
                console.error("failed to parse JSON configuration file: 'servers' property should be an array of objects");
                return undefined;
            }
        }
    }
    if ((jsonSettings.tracker !== undefined) && !(jsonSettings.tracker instanceof Object)) {
        console.error("failed to parse JSON configuration file: 'tracker' property should be an object");
        return undefined;
    }
    if ((jsonSettings.websocketsAccess !== undefined) && !(jsonSettings.websocketsAccess instanceof Object)) {
        console.error("failed to parse JSON configuration file: 'websocketsAccess' property should be an object");
        return undefined;
    }
    return {
        servers: servers,
        tracker: jsonSettings.tracker,
        websocketsAccess: jsonSettings.websocketsAccess,
    };
}
async function runServers(tracker, settings) {
    let indexHtml = undefined;
    try {
        indexHtml = fs_1.readFileSync("index.html");
    }
    catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }
    const servers = [];
    const serverPromises = settings.servers.map(async (serverSettings) => {
        const server = buildServer(tracker, serverSettings, settings.websocketsAccess, indexHtml, servers);
        servers.push(server);
        await server.run();
        console.info(`listening ${server.settings.server.host}:${server.settings.server.port}`);
    });
    await Promise.all(serverPromises);
}
function buildServer(tracker, serverSettings, websocketsAccess, indexHtml, servers) {
    if (!(serverSettings instanceof Object)) {
        throw Error("failed to parse JSON configuration file: 'servers' property should be an array of objects");
    }
    const server = new uws_tracker_1.UWebSocketsTracker(tracker, Object.assign(Object.assign({}, serverSettings), { access: websocketsAccess }));
    server.app.get("/", (response, request) => {
        debugRequest(server, request);
        if (indexHtml === undefined) {
            const status = "404 Not Found";
            response.writeStatus(status).end(status);
        }
        else {
            response.end(indexHtml);
        }
    }).get("/stats.json", (response, request) => {
        debugRequest(server, request);
        const load = new Array();
        load.push({
            platform: os.platform(),
            cps: os.cpuCount(),
            freemem: os.freemem(),
            totalMem: os.totalmem(),
            freememPercentage: os.freememPercentage(),
            loadAverage: os.loadavg(15),
        });
        const swarms = tracker.swarms;
        let peersCount = 0;
        const peersDetails = "";
        for (const swarm of swarms.values()) {
            peersCount += swarm.peers.length;
        }
        const serversStats = new Array();
        for (const serverForStats of servers) {
            const settings = serverForStats.settings;
            serversStats.push({
                server: `${settings.server.host}:${settings.server.port}`,
                webSocketsCount: serverForStats.stats.webSocketsCount,
                peersDetails: peersDetails,
            });
        }
        response.
            writeHeader("Content-Type", "application/json").
            end(JSON.stringify({
            torrentsCount: swarms.size,
            peersCount: peersCount,
            servers: serversStats,
            load: load,
            memory: process.memoryUsage(),
        }));
    }).any("/*", (response, request) => {
        debugRequest(server, request);
        const status = "404 Not Found";
        response.writeStatus(status).end(status);
    });
    return server;
}
function debugRequest(server, request) {
    if (debugRequestsEnabled) {
        debugRequests(server.settings.server.host, server.settings.server.port, "request method:", request.getMethod(), "url:", request.getUrl(), "query:", request.getQuery());
    }
}
async function run() {
    try {
        await main();
    }
    catch (e) {
        console.error(e);
    }
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
