import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'floework-worker-focus-stability',
  brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
})

const consumer = kafka.consumer({ groupId: 'focus-stability-group' })

async function run() {
  await consumer.connect()
  await consumer.subscribe({ topic: 'focus.events', fromBeginning: false })

  console.log('Worker listening for focus.events...')

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return
      
      const payload = JSON.parse(message.value.toString())
      console.log(`Processing event: ${payload.type} for user: ${payload.userId}`)

      if (payload.type === 'FOCUS_SESSION_COMPLETED') {
        // Implement Focus Stability Calculation
        // E.g., read user's last 5 sessions, calculate variance in duration,
        // compute a stability score, and write to PostgreSQL.
        
        const duration = payload.durationSecs
        console.log(`Completed session of ${duration} seconds. Calculating stability...`)
        
        // Simulating heavy ordered processing...
        await new Promise(r => setTimeout(r, 1000))
        
        console.log(`Updated focus stability score for user ${payload.userId}`)
      }
    },
  })
}

run().catch(console.error)
