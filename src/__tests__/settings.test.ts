import { AMQP } from '../AMQPConnection';
import { ISettings } from '../Interfaces';

describe('AMQPConnection', () => {
  let amqpConnection: AMQP;

  it('should return default settings', () => {
    const settings: ISettings = {
        hostname: 'localhost',
        port: 5672,
        username: 'guest',
        password: 'guest',
        vhost: '/',
        heartbeat: 60,
        reconnect: true,
        reconnectDelayMs: 2000,
      };

    amqpConnection = new AMQP(settings);


    const returnedSettings = amqpConnection.getSettings();

    expect(returnedSettings).toEqual({
      hostname: 'localhost',
      port: 5672,
      protocol: 'amqp',
      username: 'guest',
      password: '********',
      vhost: '/',
      heartbeat: 60,
      reconnect: true,
      reconnectDelayMs: 2000
    });

  });
});