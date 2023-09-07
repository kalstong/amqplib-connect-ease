/// <reference types="node" />
import { Channel, Options, ConfirmChannel, ConsumeMessage } from "amqplib";
import { IChannelOptions, ISettings, ITLSOptions, channelType, eventType, exchangeType, protocolType } from './Interfaces';
/**
 * AMQP connection class
 * @class AMQP
 * @param settings The connection settings
 * @param tlsOptions The TLS options
 * @returns An AMQP connection object
 */
export declare class AMQP {
    private settings;
    private tlsOptions?;
    private connection?;
    private emitter;
    private reconnectTimer?;
    private connecting?;
    private disconnecting?;
    constructor(settings: ISettings, tlsOptions?: ITLSOptions);
    /**
     * Get the current connection settings
     * @returns The current connection settings
     */
    getSettings(): {
        username: string;
        password: string;
        heartbeat?: number | undefined;
        hostname: string;
        port: number;
        protocol?: protocolType | undefined;
        reconnect?: boolean | undefined;
        reconnectDelayMs?: number | undefined;
        vhost?: string | undefined;
    };
    /**
     * Retry to connect to RabbitMQ
     * @returns void
     */
    private retry;
    /**
     * Connect to RabbitMQ
     * @returns void
     * @throws Error if the connection could not be established for any reason, or if the connection is already open
     */
    connect(): Promise<void>;
    /**
     * Close the connection
     * @returns void
     * @throws Error if the connection is not open, or if the connection could not be closed for any reason
     */
    disconnect(): Promise<void>;
    /**
     * Create a channel
     * @param options The channel options
     * @returns A channel wrapper object
     * @throws Error if the connection is not open, or if the channel could not be created for any reason
     */
    createChannel(options: IChannelOptions): Promise<AMQPChannel | undefined>;
    /**
     * Remove an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    off(event: eventType, cb: (...args: unknown[]) => void): void;
    /**
     * Add an event listener
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    on(event: eventType, cb: (...args: unknown[]) => void): void;
    /**
     * Add an event listener that will be called only once
     * @param event The event name
     * @param cb The callback function
     * @returns void
     */
    once(event: eventType, cb: (...args: unknown[]) => void): void;
}
/**
 * AMQP channel wrapper class
 * @class AMQPChannel
 * @param channel The channel object
 * @param channelType The channel type
 */
declare class AMQPChannel {
    channel: Channel | ConfirmChannel | undefined;
    channelType: channelType;
    constructor(channel: Channel, channelType: channelType);
    /**
     * Create a queue
     * @param queueName The queue name. '' will create a unique queue name
     * @param options The queue options
     * @returns The queue name
     * @throws Error if the channel is closed, or if the queue could not be created for any reason
     */
    createQueue(queueName: string, options?: Options.AssertQueue): Promise<string>;
    /**
     * Delete a queue
     * @param queueName The queue name
     * @param options The delete options
     * @returns The number of messages deleted
     * @throws Error if the channel is closed, or if the queue could not be deleted for any reason
     */
    deleteQueue(queueName: string, options?: Options.DeleteQueue): Promise<number>;
    /**
     * Bind a queue to an exchange
     * @param queueName The queue name
     * @param exchangeName The exchange name
     * @param routingKey The routing key
     * @returns void
     * @throws Error if the channel is closed, or if the queue could not be bound to the exchange for any reason
     */
    bindQueue(queueName: string, exchangeName: string, routingKey: string): Promise<void>;
    /**
     * Purge a queue
     * @param queueName The queue name
     * @returns The number of messages purged
     * @throws Error if the channel is closed, or if the queue could not be purged for any reason
     */
    purgeQueue(queueName: string): Promise<number>;
    /**
     * Create an exchange
     * @param exchangeName The exchange name
     * @param type The exchange type
     * @param options The exchange options
     * @returns The exchange name
     * @throws Error if the channel is closed, or if the exchange could not be created for any reason
     */
    createExchange(exchangeName: string, type: exchangeType, options?: Options.AssertExchange): Promise<string>;
    /**
    * Publish a message to an exchange
    * @param exchangeName The exchange name
    * @param routingKey The routing key
    * @param content The message content
    * @param options The publish options
    * @returns true if the message was published, false otherwise. When false, a 'drain' event will be emitted when the publish buffer becomes empty
    * @throws Error if the message could not be published for any reason (e.g. channel closed, invalid content type, etc.)
    */
    publish(exchangeName: string, routingKey: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish): boolean;
    /**
     * Send a message to a queue
     * @param queueName The queue name
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was sent, false otherwise. When false, a 'drain' event will be emitted when the publish buffer becomes empty
     * @throws Error if the message could not be sent for any reason (e.g. channel closed, invalid content type, etc.)
     */
    sendToQueue(queueName: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish): boolean;
    /**
     * Consume messages from a queue
     * @param queueName The queue name
     * @param onMessage The callback function to be called when a message is received
     * @param options The consume options
     * @returns The consumer tag
     * @throws Error if the channel is closed
     */
    consume(queueName: string, onMessage: (msg: ConsumeMessage | null) => void, options?: Options.Consume): Promise<string>;
    /**
     * Acknowledge a message
     * @param message The message to be acknowledged
     * @param allUpTo If true, all messages up to and including the supplied message will be acknowledged
     * @returns void
     * @throws Error if the channel is closed
     */
    ack(message: ConsumeMessage, allUpTo?: boolean): void;
    /**
     * Acknowledge all messages
     * @returns void
     * @throws Error if the channel is closed
     */
    ackAll(): void;
    /**
     * Reject a message
     * @param message The message to be rejected
     * @param allUpTo If true, all messages up to and including the supplied message will be rejected
     * @param requeue If true, the message will be requeued
     * @returns void
     * @throws Error if the channel is closed
     */
    nack(message: ConsumeMessage, allUpTo?: boolean, requeue?: boolean): void;
    /**
     * Reject all messages
     * @param requeue If true, the messages will be requeued
     * @returns void
     * @throws Error if the channel is closed
     */
    nackAll(requeue?: boolean): void;
    /**
     * Publish and wait for a reply
     * @param exchangeName The exchange name
     * @param routingKey The routing key
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was published and confirmed, false otherwise
     * @throws Error if the channel is closed, or if the channel is not a confirm channel
     */
    publishAndWaitConfirm(exchangeName: string, routingKey: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish): Promise<boolean>;
    /**
     * Send to queue and wait for a reply
     * @param queueName The queue name
     * @param content The message content
     * @param options The publish options
     * @returns true if the message was sent and confirmed, false otherwise
     * @throws Error if the channel is closed, or if the channel is not a confirm channel
     */
    sendToQueueAndWaitConfirm(queueName: string, content: Buffer | string | object | Array<unknown>, options?: Options.Publish): Promise<boolean>;
    /**
     * Close the channel
     * @returns void
     * @throws Error if the channel could not be closed for any reason
     */
    close(): Promise<void>;
}
export {};
