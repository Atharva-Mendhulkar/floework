import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'floework-api',
  brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
  // Add SASL and SSL configs here for production
})

const producer = kafka.producer()
let isProducerConnected = false

export async function publishEvent(topic: string, key: string, message: any) {
  if (!isProducerConnected) {
    await producer.connect()
    isProducerConnected = true
  }

  await producer.send({
    topic,
    messages: [
      { key, value: JSON.stringify(message) }
    ]
  })
}
