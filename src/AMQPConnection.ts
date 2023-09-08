import amqp, { Connection, Channel, Options, ConfirmChannel, ConsumeMessage } from "amqplib";
import EventEmitter from "events";
import util = require('util');
const log = util.debuglog('amqplib-connect-ease');
import {
    IChannelOptions,
    ISettings,
    ITLSOptions,
    channelType,
    eventType,
    exchangeType,
    protocolType
} from './Interfaces'


const settingsDefaults: Pick<ISettings, 'heartbeat' | 'reconnect' | 'reconnectDelayMs' | 'vhost' | 'protocol'> = {
    heartbeat: 60,
    reconnect: true,
    reconnectDelayMs: 2000,
    vhost: "/",
    protocol: protocolType.amqp
};

/**
 * AMQP connection class
 * @class AMQP
 * @param settings The connection settings
 * @param tlsOptions The TLS options
 * @returns An AMQP connection object
 */
export class AMQP {
    private settings: ISettings;
    private tlsOptions?: ITLSOptions;
    private connection?: Connection; // amqp connection object
    private emitter: EventEmitter;
    private reconnectTimer?: NodeJS.Timeout;
    // Internal state flags to prevent concurrent connect/disconnect
    private connecting?: boolean;
    private disconnecting?: boolean;

    constructor(settings: ISettings, tlsOptions?: ITLSOptions) {
        this.settings = { ...settingsDefaults, ...settings };
        this.tlsOptions = tlsOptions;
        this.emitter = new EventEmitter();
    }

    /**
     * Get the current connection settings
     * @returns The current connection settings
     */
    getSettings() {
        return {
            ...this.settings,
            username: this.settings.username ?? 'guest',
            password: '********'
        };
    }

    /**
     * Retry to connect to RabbitMQ
     * @returns void
     */
    private retry() {
        this.reconnectTimer = setInterval(() => {
            const desc = `Reconnecting to RabbitMQ in ${this.settings.reconnectDelayMs}ms`
            log(desc);
            this.emitter.emit("reconnecting", desc)
    
            this.connect();
        }, this.settings.reconnectDelayMs);
    }

    /**
     * Connect to RabbitMQ
     * @returns void
     * @throws Error if the connection could not be established for any reason, or if the connection is already open
     */
    async connect() {
        if (this.connecting || this.disconnecting) {
            log("Already connecting or disconnecting");
        }

        this.connecting = true;
        this.connection = undefined;

        return amqp.connect(this.settings, this.tlsOptions)
            .then((connection: Connection) => {
                this.connection = connection;

                // Clear any reconnect interval
                if (typeof this.reconnectTimer !== "undefined") {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = undefined;
                }

                this.connection.on('blocked', reason => {
                    log("Connection to RabbitMQ blocked", reason)
                    this.emitter.emit("blocked")
                })

                this.connection.on('unblocked', () => {
                    log("Connection to RabbitMQ unblocked")
                    this.emitter.emit("unblocked")
                })

                this.connection.on("error", (err: Error) => {
                    log(err.message);
                    this.emitter.emit("error", err)
                    // Activate automatic reconnect
                    if (this.settings.reconnect && !this.reconnectTimer && !this.disconnecting) {
                        this.retry();
                    }
                });

                this.connection.on("close", () => {
                    log("Connection to RabbitMQ closed");
                    this.emitter.emit("close")
                    // Activate automatic reconnect
                    if (this.settings.reconnect && !this.reconnectTimer && !this.disconnecting) {
                        this.retry();
                    }
                });

                if (typeof this.connection != "undefined") {
                    log("Connected to RabbitMQ");
                    this.connecting = false;
                    this.emitter.emit("connected")
                }
            })
            .catch((err: Error) => {
                log(err.message, this.getSettings());
                if (this.settings.reconnect && !this.reconnectTimer) {
                    this.connection = undefined;
                    throw err;
                }
            });
    }

    /**
     * Close the connection
     * @returns void
     * @throws Error if the connection is not open, or if the connection could not be closed for any reason
     */
    async disconnect() {
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
        };
    }

    /**
     * Create a channel
     * @param options The channel options
     * @returns A channel wrapper object
     * @throws Error if the connection is not open, or if the channel could not be created for any reason
     */
    async createChannel(options: IChannelOptions) {

        if (this.connecting || this.disconnecting) {
            log("Already connecting or disconnecting");
            return Promise.reject(new Error("Still connecting or disconnecting"));
        }

        if (typeof this.connection !== "undefined") {
            return (options.type === channelType.regular ?
                this.connection.createChannel() :
                this.connection.createConfirmChannel())
                .then((channel) => {
                    // Configure channel prefetch
                    if (options.prefetch && Number.isSafeInteger(options.prefetch) && options.prefetch > 0) {
                        return channel.prefetch(options.prefetch).then(() => channel);
                    }
                    else return channel;
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
    }

    /**
     * Remove an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    off(event: eventType, cb: (...args: unknown[]) => void) { this.emitter.off(event, cb); }

    /**
     * Add an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    on(event: eventType, cb: (...args: unknown[]) => void) { this.emitter.on(event, cb); }

    /**
     * Add an event listener that will be called only once
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    once(event: eventType, cb: (...args: unknown[]) => void) { this.emitter.once(event, cb); }
}

const queueOptionsDefault: Pick<Options.AssertQueue, 'autoDelete' | 'durable' | 'exclusive'> = {
    autoDelete: false,
    durable: false,
    exclusive: false
};

const exchangeOptionsDefault: Pick<Options.AssertExchange, 'autoDelete' | 'durable' | 'internal'> = {
    autoDelete: false,
    durable: false,
    internal: false
};

const publishOptionsDefault: Pick<Options.Publish, 'contentEncoding'> = {
    contentEncoding: 'utf-8'
};

const consumeOptionsDefault: Pick<Options.Consume, 'exclusive' | 'noAck' | 'noLocal'> = {
    exclusive: false,
    noAck: true,
    noLocal: false
}

/**
 * AMQP channel wrapper class
 * @class AMQPChannel
 * @param channel The channel object
 * @param channelType The channel type
 */
class AMQPChannel {
    channel: Channel | ConfirmChannel | undefined;
    channelType: channelType;

    constructor(channel: Channel, channelType: channelType) {
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
    async createQueue(queueName: string, options?: Options.AssertQueue) {
        if (this.channel) {
            let queueOptions = {};
            if (options) {
                queueOptions = { ...queueOptionsDefault, ...options };
            }

            return this.channel.assertQueue(queueName, queueOptions)
                .then(({ queue }) => queue)
                .catch(err => {
                    log(err.message);
                    throw err;
                });
        }

        return Promise.reject(new Error("Using a closed Channel to create a queue"));
    }

    /**
     * Delete a queue
     * @param queueName The queue name
     * @param options The delete options
     * @returns The number of messages deleted
     * @throws Error if the channel is closed, or if the queue could not be deleted for any reason
     */
    async deleteQueue(queueName: string, options?: Options.DeleteQueue) {
        if (this.channel) {
            return this.channel.deleteQueue(queueName, options)
                .then(({ messageCount }) => messageCount)
                .catch(err => {
                    log(err.message);
                    throw err;
                });
        }

        return Promise.reject(new Error("Using a closed Channel to delete a queue"));
    }

    /**
     * Bind a queue to an exchange
     * @param queueName The queue name
     * @param exchangeName The exchange name
     * @param routingKey The routing key
     * @returns void
     * @throws Error if the channel is closed, or if the queue could not be bound to the exchange for any reason
     */
    async bindQueue(queueName: string, exchangeName: string, routingKey: string) {
        if (this.channel) {
            return this.channel.bindQueue(queueName, exchangeName, routingKey)
                .then(() => Promise.resolve())
                .catch(err => {
                    log(err.message);
                    throw err;
                })
        }

        return Promise.reject(new Error("Using a closed Channel to bind a queue to an exchange"));
    }

    /**
     * Purge a queue
     * @param queueName The queue name
     * @returns The number of messages purged
     * @throws Error if the channel is closed, or if the queue could not be purged for any reason
     */
    async purgeQueue(queueName: string) {
        if (this.channel) {
            return this.channel.purgeQueue(queueName)
                .then(({ messageCount }) => messageCount)
                .catch(err => {
                    log(err.message);
                    throw err;
                });
        }

        return Promise.reject(new Error("Using a closed Channel to purge a queue"));
    }

    /**
     * Create an exchange
     * @param exchangeName The exchange name
     * @param type The exchange type
     * @param options The exchange options
     * @returns The exchange name
     * @throws Error if the channel is closed, or if the exchange could not be created for any reason
     */
    async createExchange(exchangeName: string, type: exchangeType, options?: Options.AssertExchange) {
        if (this.channel) {
            let exchangeOptions = {};
            if (options) {
                exchangeOptions = { ...exchangeOptionsDefault, ...options };
            }

            return this.channel.assertExchange(exchangeName, type, exchangeOptions)
                .then(({ exchange }) => exchange)
                .catch(err => {
                    log(err.message);
                    throw err;
                });
        }

        return Promise.reject(new Error("Using a closed Channel to create an exchange"));
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
    publish(exchangeName: string, routingKey: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish) : boolean {
        if (this.channel) {
            let publishOptions: Options.Publish = {};
            if (options) {
                publishOptions = { ...publishOptionsDefault, ...options };
            }

            const encoding: BufferEncoding = publishOptions.contentEncoding as BufferEncoding ||
                publishOptionsDefault.contentEncoding as BufferEncoding;

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

                if (this.channelType === channelType.regular) {
                    return this.channel.publish(exchangeName, routingKey, buffer, publishOptions)
                } else if (this.channelType === channelType.confirm) {
                    return this.channel.publish(exchangeName, routingKey, buffer, publishOptions, (err) => {
                        if (err) {
                            log(err.message);
                            throw err;
                        }
                    });
                }

            } catch (err) {
                log((err as Error).message);
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
    sendToQueue(queueName: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish) : boolean {
        if (this.channel) {
            let publishOptions: Options.Publish = {};
            if (options) {
                publishOptions = { ...publishOptionsDefault, ...options };
            }

            const encoding: BufferEncoding = publishOptions.contentEncoding as BufferEncoding ||
                publishOptionsDefault.contentEncoding as BufferEncoding;

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

                if (this.channelType === channelType.regular) {
                    return this.channel.sendToQueue(queueName, buffer, publishOptions)
                } else if (this.channelType === channelType.confirm) {
                    return this.channel.sendToQueue(queueName, buffer, publishOptions, (err) => {
                        if (err) {
                            log(err.message);
                            throw err;
                        }
                    });
                }

            } catch (err) {
                log((err as Error).message);
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
    async consume(queueName: string, onMessage: (msg: ConsumeMessage | null) => void, options?: Options.Consume) {
        if (this.channel) {
            let consumeOptions = {};
            if (options) {
                consumeOptions = { ...consumeOptionsDefault, ...options };
            }

            return this.channel.consume(queueName, onMessage, consumeOptions)
                .then(({ consumerTag }) => consumerTag)
                .catch(err => {
                    log(err.message);
                    throw err;
                });
        }

        return Promise.reject(new Error("Using a closed Channel to consume a queue"));
    }

    /**
     * Acknowledge a message
     * @param message The message to be acknowledged
     * @param allUpTo If true, all messages up to and including the supplied message will be acknowledged
     * @returns void
     * @throws Error if the channel is closed
     */
    ack(message: ConsumeMessage, allUpTo?: boolean) {
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
    nack(message: ConsumeMessage, allUpTo?: boolean, requeue?: boolean) {
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
    nackAll(requeue?: boolean) {
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
    async publishAndWaitConfirm(exchangeName: string, routingKey: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish) : Promise<boolean> {
        if (this.channel) {
            if (this.channelType !== channelType.confirm) {
                log("Channel is not a confirm channel");
                throw new Error("Channel is not a confirm channel");
            }
            
            const published = this.publish(exchangeName, routingKey, content, options);
            if (!published) {
                return Promise.resolve(false);
            }
            
            return (this.channel as ConfirmChannel).waitForConfirms()
            .then(() => {
                return true;
            })
            .catch((err: Error) => {
                log(err.message);
                return false;
            });
            
        }

        throw new Error("Using a closed Channel to wait for reply");
    }

    /**
     * Send to queue and wait for a reply
     * @param queueName The queue name
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was sent and confirmed, false otherwise
     * @throws Error if the channel is closed, or if the channel is not a confirm channel
     */
    async sendToQueueAndWaitConfirm(queueName: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish) : Promise<boolean> {
        if (this.channel) {
            if (this.channelType !== channelType.confirm) {
                log("Channel is not a confirm channel");
                throw new Error("Channel is not a confirm channel");
            }
            
            const sent = this.sendToQueue(queueName, content, options);
            if (!sent) {
                return Promise.resolve(false);
            }
            
            return (this.channel as ConfirmChannel).waitForConfirms()
            .then(() => {
                return true;
            })
            .catch((err: Error) => {
                log(err.message);
                return false;
            });
            
        }

        throw new Error("Using a closed Channel to wait for reply");
    }

    /**
     * Close the channel
     * @returns void
     * @throws Error if the channel could not be closed for any reason
     */
    async close() {
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
    }
}