"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeType = exports.channelType = exports.eventType = exports.protocolType = void 0;
var protocolType;
(function (protocolType) {
    protocolType["amqp"] = "amqp";
    protocolType["amqps"] = "amqps";
})(protocolType || (exports.protocolType = protocolType = {}));
var eventType;
(function (eventType) {
    eventType["blocked"] = "blocked";
    eventType["unblocked"] = "unblocked";
    eventType["error"] = "error";
    eventType["close"] = "close";
    eventType["connected"] = "connected";
    eventType["reconnecting"] = "reconnecting";
})(eventType || (exports.eventType = eventType = {}));
var channelType;
(function (channelType) {
    channelType["regular"] = "regular";
    channelType["confirm"] = "confirm";
})(channelType || (exports.channelType = channelType = {}));
var exchangeType;
(function (exchangeType) {
    exchangeType["direct"] = "direct";
    exchangeType["topic"] = "topic";
    exchangeType["headers"] = "headers";
    exchangeType["fanout"] = "fanout";
    exchangeType["match"] = "headers";
})(exchangeType || (exports.exchangeType = exchangeType = {}));
