export enum protocolType {
    amqp = 'amqp',
    amqps = 'amqps'
}

export enum eventType {
    blocked = 'blocked',
    unblocked = 'unblocked',
    error = 'error',
    close = 'close',
    connected = 'connected',
    reconnecting = 'reconnecting'
}

export enum channelType {
    regular = 'regular',
    confirm = 'confirm'
}

export enum exchangeType {
    direct = 'direct',
    topic = 'topic',
    headers = 'headers',
    fanout = 'fanout',
    match = headers
}

export interface IChannelOptions {
    type: channelType,
    prefetch?: number,
}

export interface ISettings {
    heartbeat?: number,
    hostname: string,
    port: number,
    protocol?: protocolType,
    reconnect?: boolean,
    reconnectDelayMs?: number,
    vhost?: string,
    username?: string,
    password?: string
}

export interface ITLSOptions {
    cert: Buffer,
    key: Buffer,
    passphrase?: string,
    ca: [Buffer]
}