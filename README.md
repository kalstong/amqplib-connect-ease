# amqplib-connect-ease

[![npm version](https://badge.fury.io/js/amqplib-connect-ease.svg)](https://badge.fury.io/js/amqplib-connect-ease)

This npm package serves as a convenient wrapper for working with RabbitMQ using AMQP in Node.js applications.

It allows users to establish and manage connections to RabbitMQ servers.

It provides methods for connecting and disconnecting from RabbitMQ.

It can emit events such as "reconnecting," "connected," "blocked," "unblocked," "error," and "close" to notify users about connection status and events.

It supports automatic connection recovery with configurable options like recoverDelayMs.

Its a wrapper for [amqplib v0.10.3](https://www.npmjs.com/package/amqplib/v/0.10.3)  to add connection handling.

## Installation

To install this package, run:

`npm install amqplib-connect-ease`

## Usage

### Creating an AMQP Connection
To establish a connection to a RabbitMQ server, create an instance of the AMQP class with the desired connection settings:
```javascript
import { AMQP } from 'amqplib-connect-ease';

const connectionSettings = {
  hostname: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
  vhost: '/',
  heartbeat: 60,
  reconnect: true,
  reconnectDelayMs: 2000,
};

const amqpConnection = new AMQP(connectionSettings);
```

### Connecting to RabbitMQ
To connect to RabbitMQ, call the connect method on the AMQP instance. It returns a Promise that resolves when the connection is established:
```javascript
amqpConnection.connect()
  .then(() => {
    // Connection is established, you can now work with channels and queues.
  })
  .catch((error) => {
    console.error('Connection error:', error);
  });
```

### Creating a Channel
After connecting, you can create channels for message operations. Channels are instances of the AMQPChannel class. To create a channel, use the createChannel method:
```javascript
const channelOptions = {
  type: 'regular', // or 'confirm' for a confirm channel
  prefetch: 10,    // Optional: Set the message prefetch count
};

amqpConnection.createChannel(channelOptions)
  .then((channel) => {
    // Channel is created and ready for use.
  })
  .catch((error) => {
    console.error('Channel creation error:', error);
  });

```

### Creating an Exchange
To create an exchange, use the createExchange method of an AMQPChannel:
```javascript
const exchangeName = 'myExchange';
const exchangeOptions = {
  type: 'direct', // or 'fanout', 'topic', 'headers'
  durable: true,
  autoDelete: false,
};

channel.createExchange(exchangeName, exchangeOptions)
  .then(() => {
    console.log('Exchange created successfully');
  })
  .catch((error) => {
    console.error('Exchange creation error:', error);
  });

```

### Creating a Queue
To create a queue, use the createQueue method of an AMQPChannel:
```javascript
const queueName = 'myQueue';
const queueOptions = {
  durable: true,
  autoDelete: false,
};

channel.createQueue(queueName, queueOptions)
  .then(() => {
    console.log('Queue created successfully');
  })
  .catch((error) => {
    console.error('Queue creation error:', error);
  });

```

### Purging a Queue
To purge a queue, use the purgeQueue method of an AMQPChannel:
```javascript
const queueName = 'myQueue';

channel.purgeQueue(queueName)
  .then(() => {
    console.log('Queue purged successfully');
  })
  .catch((error) => {
    console.error('Queue purge error:', error);
  });

```

### Deleting a queue
To delete a queue, use the deleteQueue method of an AMQPChannel:
```javascript
const queueName = 'myQueue';

channel.deleteQueue(queueName)
  .then(() => {
    console.log('Queue deleted successfully');
  })
  .catch((error) => {
    console.error('Queue deletion error:', error);
  });

```

### Binding a Queue to an Exchange
To bind a queue to an exchange, use the bindQueue method of an AMQPChannel:
```javascript
const queueName = 'myQueue';
const exchangeName = 'myExchange';
const routingKey = 'myRoutingKey';

channel.bindQueue(queueName, exchangeName, routingKey)
  .then(() => {
    console.log('Queue bound successfully');
  })
  .catch((error) => {
    console.error('Queue binding error:', error);
  });

```

### Publishing a Message to an Exchange
You can publish messages to exchanges or queues using the publish method of an AMQPChannel:
```javascript
const exchangeName = 'myExchange';
const routingKey = 'myRoutingKey';
const message = 'Hello, RabbitMQ!';
const options = {
  persistent: true, // Set to true to persist the message.
};

channel.publish(exchangeName, routingKey, message, options)
  ? console.log('Message published successfully')
  : console.error('Failed to publish message');
```

### Publishing a Message to a Queue
You can publish messages to exchanges or queues using the sendToQueue method of an AMQPChannel:
```javascript
const queueName = 'myQueue';
const message = 'Hello, RabbitMQ!';
const options = {
  persistent: true, // Set to true to persist the message.
};

channel.sendToQueue(queueName, message, options)
  ? console.log('Message published successfully')
  : console.error('Failed to publish message');
```

### Publish a message and wait for a confirmation
You can publish messages to exchanges or queues using the publishAndWaitConfirm method of an AMQPChannel:
```javascript
const exchangeName = 'myExchange';
const routingKey = 'myRoutingKey';
const message = 'Hello, RabbitMQ!';
const options = {
  persistent: true, // Set to true to persist the message.
};

channel.publishAndWaitConfirm(exchangeName, routingKey, message, options)
  .then(() => {
    console.log('Message published successfully');
  })
  .catch((error) => {
    console.error('Failed to publish message:', error);
  });
```

### Consuming Messages
To consume messages from a queue, use the consume method of an AMQPChannel. Provide a callback function to handle incoming messages:
```javascript
const queueName = 'myQueue';

channel.consume(queueName, (message) => {
  if (message) {
    console.log('Received message:', message.content.toString());
    // If the created channel is a confirm channel, acknowledge the message: channel.ack(message);
  }
});

```

### Acknowledging a Message
To acknowledge a message, use the ack method of an AMQPChannel:
```javascript
channel.ack(message);
```

### Rejecting a Message
To reject a message, use the reject method of an AMQPChannel:
```javascript
channel.reject(message);
```

### Acknowledging All messages inckuding the given message
To acknowledge all messages, use the ackAll method of an AMQPChannel:
```javascript
channel.ackAll(message);
```

### Rejecting All messages inckuding the given message
To reject all messages, use the rejectAll method of an AMQPChannel:
```javascript
channel.rejectAll(message);
```


### Disconnecting and Cleanup
When finished, you can disconnect from RabbitMQ and clean up resources:
```javascript
amqpConnection.disconnect()
  .then(() => {
    console.log('Disconnected from RabbitMQ');
  })
  .catch((error) => {
    console.error('Disconnect error:', error);
  });

```

### Events

The package emits events for various connection and channel-related events. You can listen for these events using the on method:
```javascript
amqpConnection.on('reconnecting', (description) => {
  console.log('Reconnecting:', description);
});

// Other events: 'connected', 'blocked', 'unblocked', 'error', 'close'

```

### Error Handling

The package handles errors for common scenarios such as failed connections or channel operations. You can handle errors by catching and logging them:
```javascript
amqpConnection.connect()
.catch((error) => {
  console.error('Connection error:', error);
});

channel.publish(exchangeName, routingKey, message)
.catch((error) => {
  console.error('Message publishing error:', error);
});
```


## Contributing

If you would like to contribute to this package, please follow these guidelines:

- Fork the repository
- Create a new branch for your changes
- Make your changes and commit them
- Push your changes to your fork
- Submit a pull request


## License
This package is licensed under the MIT License.