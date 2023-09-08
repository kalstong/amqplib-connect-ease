"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMQP = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const events_1 = __importDefault(require("events"));
const util = require("util");
const log = util.debuglog('amqplib-connect-ease');
const Interfaces_1 = require("./Interfaces");
const settingsDefaults = {
    heartbeat: 60,
    reconnect: true,
    reconnectDelayMs: 2000,
    vhost: "/",
    protocol: Interfaces_1.protocolType.amqp
};
/**
 * AMQP connection class
 * @class AMQP
 * @param settings The connection settings
 * @param tlsOptions The TLS options
 * @returns An AMQP connection object
 */
class AMQP {
    constructor(settings, tlsOptions) {
        this.settings = Object.assign(Object.assign({}, settingsDefaults), settings);
        this.tlsOptions = tlsOptions;
        this.emitter = new events_1.default();
    }
    /**
     * Get the current connection settings
     * @returns The current connection settings
     */
    getSettings() {
        var _a;
        return Object.assign(Object.assign({}, this.settings), { username: (_a = this.settings.username) !== null && _a !== void 0 ? _a : 'guest', password: '********' });
    }
    /**
     * Retry to connect to RabbitMQ
     * @returns void
     */
    retry() {
        const desc = `Reconnecting to RabbitMQ in ${this.settings.reconnectDelayMs}ms`;
        log(desc);
        this.emitter.emit("reconnecting", desc);
        this.reconnectTimer = setInterval(() => {
            log("Reconnecting to RabbitMQ");
            this.connect();
        }, this.settings.reconnectDelayMs);
    }
    /**
     * Connect to RabbitMQ
     * @returns void
     * @throws Error if the connection could not be established for any reason, or if the connection is already open
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connecting || this.disconnecting) {
                log("Already connecting or disconnecting");
            }
            this.connecting = true;
            this.connection = undefined;
            return amqplib_1.default.connect(this.settings, this.tlsOptions)
                .then((connection) => {
                this.connection = connection;
                // Clear any reconnect interval
                if (typeof this.reconnectTimer !== "undefined") {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = undefined;
                }
                this.connection.on('blocked', reason => {
                    log("Connection to RabbitMQ blocked", reason);
                    this.emitter.emit("blocked");
                });
                this.connection.on('unblocked', () => {
                    log("Connection to RabbitMQ unblocked");
                    this.emitter.emit("unblocked");
                });
                this.connection.on("error", (err) => {
                    log(err.message);
                    this.emitter.emit("error", err);
                    // Activate automatic reconnect
                    if (this.settings.reconnect && !this.reconnectTimer && !this.disconnecting) {
                        this.retry();
                    }
                });
                this.connection.on("close", () => {
                    log("Connection to RabbitMQ closed");
                    this.emitter.emit("close");
                    // Activate automatic reconnect
                    if (this.settings.reconnect && !this.reconnectTimer && !this.disconnecting) {
                        this.retry();
                    }
                });
                if (typeof this.connection != "undefined") {
                    log("Connected to RabbitMQ");
                    this.connecting = false;
                    this.emitter.emit("connected");
                }
            })
                .catch((err) => {
                log(err.message, this.getSettings());
                if (this.settings.reconnect && !this.reconnectTimer) {
                    this.connection = undefined;
                    throw err;
                }
            });
        });
    }
    /**
     * Close the connection
     * @returns void
     * @throws Error if the connection is not open, or if the connection could not be closed for any reason
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connection) {
                this.disconnecting = true;
                return this.connection.close()
                    .then(() => {
                    this.connection = undefined;
                    this.disconnecting = false;
                })
                    .catch(err => {
                    log(err.message, this.getSettings());
                    throw err;
                });
            }
            ;
        });
    }
    /**
     * Create a channel
     * @param options The channel options
     * @returns A channel wrapper object
     * @throws Error if the connection is not open, or if the channel could not be created for any reason
     */
    createChannel(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connecting || this.disconnecting) {
                log("Already connecting or disconnecting");
                return Promise.reject(new Error("Still connecting or disconnecting"));
            }
            if (typeof this.connection !== "undefined") {
                return (options.type === Interfaces_1.channelType.regular ?
                    this.connection.createChannel() :
                    this.connection.createConfirmChannel())
                    .then((channel) => {
                    // Configure channel prefetch
                    if (options.prefetch && Number.isSafeInteger(options.prefetch) && options.prefetch > 0) {
                        return channel.prefetch(options.prefetch).then(() => channel);
                    }
                    else
                        return channel;
                })
                    .then((channel) => {
                    // Return channel wrapper
                    return new AMQPChannel(channel, options.type);
                })
                    .catch(err => {
                    log(err.message, this.getSettings());
                    throw err;
                });
            }
        });
    }
    /**
     * Remove an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    off(event, cb) { this.emitter.off(event, cb); }
    /**
     * Add an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    on(event, cb) { this.emitter.on(event, cb); }
    /**
     * Add an event listener that will be called only once
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    once(event, cb) { this.emitter.once(event, cb); }
}
exports.AMQP = AMQP;
const queueOptionsDefault = {
    autoDelete: false,
    durable: false,
    exclusive: false
};
const exchangeOptionsDefault = {
    autoDelete: false,
    durable: false,
    internal: false
};
const publishOptionsDefault = {
    contentEncoding: 'utf-8'
};
const consumeOptionsDefault = {
    exclusive: false,
    noAck: true,
    noLocal: false
};
/**
 * AMQP channel wrapper class
 * @class AMQPChannel
 * @param channel The channel object
 * @param channelType The channel type
 */
class AMQPChannel {
    constructor(channel, channelType) {
        this.channel = channel;
        this.channelType = channelType;
    }
    /**
     * Create a queue
     * @param queueName The queue name. '' will create a unique queue name
     * @param options The queue options
     * @returns The queue name
     * @throws Error if the channel is closed, or if the queue could not be created for any reason
     */
    createQueue(queueName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                let queueOptions = {};
                if (options) {
                    queueOptions = Object.assign(Object.assign({}, queueOptionsDefault), options);
                }
                return this.channel.assertQueue(queueName, queueOptions)
                    .then(({ queue }) => queue)
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to create a queue"));
        });
    }
    /**
     * Delete a queue
     * @param queueName The queue name
     * @param options The delete options
     * @returns The number of messages deleted
     * @throws Error if the channel is closed, or if the queue could not be deleted for any reason
     */
    deleteQueue(queueName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                return this.channel.deleteQueue(queueName, options)
                    .then(({ messageCount }) => messageCount)
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to delete a queue"));
        });
    }
    /**
     * Bind a queue to an exchange
     * @param queueName The queue name
     * @param exchangeName The exchange name
     * @param routingKey The routing key
     * @returns void
     * @throws Error if the channel is closed, or if the queue could not be bound to the exchange for any reason
     */
    bindQueue(queueName, exchangeName, routingKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                return this.channel.bindQueue(queueName, exchangeName, routingKey)
                    .then(() => Promise.resolve())
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to bind a queue to an exchange"));
        });
    }
    /**
     * Purge a queue
     * @param queueName The queue name
     * @returns The number of messages purged
     * @throws Error if the channel is closed, or if the queue could not be purged for any reason
     */
    purgeQueue(queueName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                return this.channel.purgeQueue(queueName)
                    .then(({ messageCount }) => messageCount)
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to purge a queue"));
        });
    }
    /**
     * Create an exchange
     * @param exchangeName The exchange name
     * @param type The exchange type
     * @param options The exchange options
     * @returns The exchange name
     * @throws Error if the channel is closed, or if the exchange could not be created for any reason
     */
    createExchange(exchangeName, type, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                let exchangeOptions = {};
                if (options) {
                    exchangeOptions = Object.assign(Object.assign({}, exchangeOptionsDefault), options);
                }
                return this.channel.assertExchange(exchangeName, type, exchangeOptions)
                    .then(({ exchange }) => exchange)
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to create an exchange"));
        });
    }
    /**
    * Publish a message to an exchange
    * @param exchangeName The exchange name
    * @param routingKey The routing key
    * @param content The message content
    * @param options The publish options
    * @returns true if the message was published, false otherwise. When false, a 'drain' event will be emitted when the publish buffer becomes empty
    * @throws Error if the message could not be published for any reason (e.g. channel closed, invalid content type, etc.)
    */
    publish(exchangeName, routingKey, content, options) {
        if (this.channel) {
            let publishOptions = {};
            if (options) {
                publishOptions = Object.assign(Object.assign({}, publishOptionsDefault), options);
            }
            const encoding = publishOptions.contentEncoding ||
                publishOptionsDefault.contentEncoding;
            try {
                let buffer = null;
                if (Buffer.isBuffer(content))
                    buffer = content;
                else if (typeof content === "string")
                    buffer = Buffer.from(content, encoding);
                else if (Array.isArray(content) || typeof content === "object")
                    buffer = Buffer.from(JSON.stringify(content), encoding);
                else {
                    log("Invalid content type");
                    throw new Error("Invalid content type");
                }
                if (this.channelType === Interfaces_1.channelType.regular) {
                    return this.channel.publish(exchangeName, routingKey, buffer, publishOptions);
                }
                else if (this.channelType === Interfaces_1.channelType.confirm) {
                    return this.channel.publish(exchangeName, routingKey, buffer, publishOptions, (err) => {
                        if (err) {
                            log(err.message);
                            throw err;
                        }
                    });
                }
            }
            catch (err) {
                log(err.message);
                throw err;
            }
        }
        throw new Error("Using a closed Channel to publish a message");
    }
    /**
     * Send a message to a queue
     * @param queueName The queue name
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was sent, false otherwise. When false, a 'drain' event will be emitted when the publish buffer becomes empty
     * @throws Error if the message could not be sent for any reason (e.g. channel closed, invalid content type, etc.)
     */
    sendToQueue(queueName, content, options) {
        if (this.channel) {
            let publishOptions = {};
            if (options) {
                publishOptions = Object.assign(Object.assign({}, publishOptionsDefault), options);
            }
            const encoding = publishOptions.contentEncoding ||
                publishOptionsDefault.contentEncoding;
            try {
                let buffer = null;
                if (Buffer.isBuffer(content))
                    buffer = content;
                else if (typeof content === "string")
                    buffer = Buffer.from(content, encoding);
                else if (Array.isArray(content) || typeof content === "object")
                    buffer = Buffer.from(JSON.stringify(content), encoding);
                else {
                    log("Invalid content type");
                    throw new Error("Invalid content type");
                }
                if (this.channelType === Interfaces_1.channelType.regular) {
                    return this.channel.sendToQueue(queueName, buffer, publishOptions);
                }
                else if (this.channelType === Interfaces_1.channelType.confirm) {
                    return this.channel.sendToQueue(queueName, buffer, publishOptions, (err) => {
                        if (err) {
                            log(err.message);
                            throw err;
                        }
                    });
                }
            }
            catch (err) {
                log(err.message);
                throw err;
            }
        }
        throw new Error("Using a closed Channel to send a message to a queue");
    }
    /**
     * Consume messages from a queue
     * @param queueName The queue name
     * @param onMessage The callback function to be called when a message is received
     * @param options The consume options
     * @returns The consumer tag
     * @throws Error if the channel is closed
     */
    consume(queueName, onMessage, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                let consumeOptions = {};
                if (options) {
                    consumeOptions = Object.assign(Object.assign({}, consumeOptionsDefault), options);
                }
                return this.channel.consume(queueName, onMessage, consumeOptions)
                    .then(({ consumerTag }) => consumerTag)
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.reject(new Error("Using a closed Channel to consume a queue"));
        });
    }
    /**
     * Acknowledge a message
     * @param message The message to be acknowledged
     * @param allUpTo If true, all messages up to and including the supplied message will be acknowledged
     * @returns void
     * @throws Error if the channel is closed
     */
    ack(message, allUpTo) {
        if (this.channel) {
            return this.channel.ack(message, allUpTo);
        }
        throw new Error("Using a closed Channel to ack a message");
    }
    /**
     * Acknowledge all messages
     * @returns void
     * @throws Error if the channel is closed
     */
    ackAll() {
        if (this.channel) {
            return this.channel.ackAll();
        }
        throw new Error("Using a closed Channel to ack all messages");
    }
    /**
     * Reject a message
     * @param message The message to be rejected
     * @param allUpTo If true, all messages up to and including the supplied message will be rejected
     * @param requeue If true, the message will be requeued
     * @returns void
     * @throws Error if the channel is closed
     */
    nack(message, allUpTo, requeue) {
        if (this.channel) {
            return this.channel.nack(message, allUpTo, requeue);
        }
        throw new Error("Using a closed Channel to nack a message");
    }
    /**
     * Reject all messages
     * @param requeue If true, the messages will be requeued
     * @returns void
     * @throws Error if the channel is closed
     */
    nackAll(requeue) {
        if (this.channel) {
            return this.channel.nackAll(requeue);
        }
        throw new Error("Using a closed Channel to nack all messages");
    }
    /**
     * Publish and wait for a reply
     * @param exchangeName The exchange name
     * @param routingKey The routing key
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was published and confirmed, false otherwise
     * @throws Error if the channel is closed, or if the channel is not a confirm channel
     */
    publishAndWaitConfirm(exchangeName, routingKey, content, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                if (this.channelType !== Interfaces_1.channelType.confirm) {
                    log("Channel is not a confirm channel");
                    throw new Error("Channel is not a confirm channel");
                }
                const published = this.publish(exchangeName, routingKey, content, options);
                if (!published) {
                    return Promise.resolve(false);
                }
                return this.channel.waitForConfirms()
                    .then(() => {
                    return true;
                })
                    .catch((err) => {
                    log(err.message);
                    return false;
                });
            }
            throw new Error("Using a closed Channel to wait for reply");
        });
    }
    /**
     * Send to queue and wait for a reply
     * @param queueName The queue name
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was sent and confirmed, false otherwise
     * @throws Error if the channel is closed, or if the channel is not a confirm channel
     */
    sendToQueueAndWaitConfirm(queueName, content, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel) {
                if (this.channelType !== Interfaces_1.channelType.confirm) {
                    log("Channel is not a confirm channel");
                    throw new Error("Channel is not a confirm channel");
                }
                const sent = this.sendToQueue(queueName, content, options);
                if (!sent) {
                    return Promise.resolve(false);
                }
                return this.channel.waitForConfirms()
                    .then(() => {
                    return true;
                })
                    .catch((err) => {
                    log(err.message);
                    return false;
                });
            }
            throw new Error("Using a closed Channel to wait for reply");
        });
    }
    /**
     * Close the channel
     * @returns void
     * @throws Error if the channel could not be closed for any reason
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.channel !== "undefined") {
                return this.channel.close()
                    .then(() => {
                    this.channel = undefined;
                })
                    .catch(err => {
                    log(err.message);
                    throw err;
                });
            }
            return Promise.resolve();
        });
    }
}
