import { Transport, MicroserviceOptions, ClientProviderOptions } from '@nestjs/microservices';

/**
 * Reads the TRANSPORT_TYPE env var (default: 'TCP') and returns the active transport mode.
 */
export function getTransportType(): 'TCP' | 'RMQ' {
  const type = (process.env.TRANSPORT_TYPE || 'TCP').toUpperCase();
  if (type !== 'TCP' && type !== 'RMQ') {
    console.warn(
      `[Messaging] Unknown TRANSPORT_TYPE "${type}", falling back to TCP`,
    );
    return 'TCP';
  }
  return type as 'TCP' | 'RMQ';
}

/**
 * Returns the microservice transport options based on the TRANSPORT_TYPE feature flag.
 * Used by main.ts for connectMicroservice() and app.module.ts for ClientsModule.register().
 */
export function getMicroserviceConfig(): MicroserviceOptions {
  const transportType = getTransportType();

  if (transportType === 'RMQ') {
    const rmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    console.log(`[Messaging] Transport: RMQ → ${rmqUrl} (queue: auth_queue)`);
    return {
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue: 'auth_queue',
        queueOptions: { durable: false },
      },
    };
  }

  // Default: TCP
  console.log('[Messaging] Transport: TCP → port 5001');
  return {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 5001,
    },
  };
}

/**
 * Returns the ClientsModule registration config for the AUTH_MICROSERVICE token.
 * This mirrors getMicroserviceConfig but adds the 'name' property for DI.
 */
export function getClientModuleConfig(): ClientProviderOptions {
  const transportType = getTransportType();

  if (transportType === 'RMQ') {
    const rmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    return {
      name: 'AUTH_MICROSERVICE',
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue: 'auth_queue',
        queueOptions: { durable: false },
      },
    } as ClientProviderOptions;
  }

  return {
    name: 'AUTH_MICROSERVICE',
    transport: Transport.TCP,
    options: { port: 5001 },
  } as ClientProviderOptions;
}


