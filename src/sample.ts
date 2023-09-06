import { AMQP, protocolType, eventType, channelType, exchangeType } from './index'


const amqp = new AMQP({
    hostname: 'localhost',
    port: 5672,
    protocol: protocolType.amqp,
    username: 'icnew',
    password: 'icnew',
    reconnectDelayMs: 3000
});

amqp.on(eventType.connected, () => {
    console.log("Connected")

    amqp.createChannel({ type: channelType.confirm, prefetch: 1 })
    .then((channel) => {
        channel.createQueue('test', { autoDelete: false })
        .then((queue) => {
            console.log(queue)
        })
        .catch((err) => {
            console.log("Error creating the queue: ", err.message)
        });

        // channel.createQueue(undefined, { autoDelete: true })
        // .then((queue) => {
        //     console.log(queue)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar uma queue: ", err.message)
        // });

        channel.bindQueue('test', 'amq.topic', 'test-topic')
        .then(() => {
            console.log('Binded')
        })
        .catch((err) => {
            console.log("Erro a criar uma queue: ", err.message)
        });

        // const result = channel.publish('amq.topic', 'test-topic', Buffer.from('Teste'));
        // console.log("RESULT: ", result);

        const result = channel.sendToQueue('test', Buffer.from('Teste'))
        console.log("RESULT: ", result);

        channel.SendToQueueAndWaitConfirm('test', Buffer.from('Teste'))
        .then(() => {
            console.log("Published")
        })
    


        // channel.PublishAndWaitConfirm('amq.topic', 'test-topic', Buffer.from('Teste'))
        // .then(() => {
        //     console.log("Published")
        // })
        // .catch((err) => {
        //     console.log("Erro a consumir uma queue: ", err.message)
        // })

        // channel.consume('test', (msg) => {
        //     console.log(msg)
        // }, { noAck: true })
        // .then((consumer) => {
        //     console.log(consumer)
        // })
        // .catch((err) => {
        //     console.log("Erro a consumir uma queue: ", err.message)
        // });

        // channel.consume('test', (msg) => {
        //     console.log(msg)
        // }, { noAck: false })
        // .then((consumer) => {
        //     console.log(consumer)
        // })
        // .catch((err) => {
        //     console.log("Erro a consumir uma queue: ", err.message)
        // });

        // channel.purgeQueue('test')
        // .then((count) => {
        //     console.log('Existiam na queue ' + count + ' mensagens')
        // })
        // .catch((err) => {
        //     console.log("Erro a apagar uma queue: ", err.message)
        // });


        // channel.deleteQueue('test')
        // .then((count) => {
        //     console.log('Existiam na queue  ' + count + ' mensagens')
        // })
        // .catch((err) => {
        //     console.log("Erro a apagar uma queue: ", err.message)
        // });

        // channel.createExchange('test-exchange-topic', exchangeType.topic, { autoDelete: true })
        // .then((exchange) => {
        //     console.log(exchange)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar um exchange: ", err.message)
        // });

        // channel.createExchange('test-exchange-match', exchangeType.match, { autoDelete: true })
        // .then((exchange) => {
        //     console.log(exchange)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar um exchange: ", err.message)
        // });

        // channel.createExchange('test-exchange-headers', exchangeType.headers, { autoDelete: true })
        // .then((exchange) => {
        //     console.log(exchange)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar um exchange: ", err.message)
        // });

        // channel.createExchange('test-exchange-fanout', exchangeType.fanout, { autoDelete: true })
        // .then((exchange) => {
        //     console.log(exchange)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar um exchange: ", err.message)
        // });

        // channel.createExchange('test-exchange-direct', exchangeType.direct, { autoDelete: true })
        // .then((exchange) => {
        //     console.log(exchange)
        // })
        // .catch((err) => {
        //     console.log("Erro a criar um exchange: ", err.message)
        // });
    })
    .catch((err) => {
        console.log("Erro a criar um channel: ", err.message)
    });

});

amqp.on(eventType.reconnecting, (description) => {
    console.log("Reconnecting", description)
});

amqp.on(eventType.close, () => {
    console.log("Closed")
});

amqp.on(eventType.error, (err) => {
    console.log("Error: ", (err as Error).message)
});


amqp.connect()
.then(() => {
    console.log("Sucesso")
    console.log(amqp.getSettings())
})
.catch((err) => {
    console.log("Erro", err.message)
})

// setTimeout(() => {
//     amqp.disconnect()
//     .then(() => {
//         console.log("Desconectado")
//     })
//     .catch((err) => {
//         console.log("Erro", err.message)
//     })
// }, 10000);