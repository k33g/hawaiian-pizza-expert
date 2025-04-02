import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { ChatOpenAI } from '@langchain/openai';

import * as fs from 'fs'

const llm = new ChatOpenAI({
  model: process.env.LLM || "emilycasey003/tinyllama:latest",
  apiKey: "",
  configuration: {
    baseURL: process.env.MODEL_RUNNER_URL || "http://host.docker.internal:12434/engines/llama.cpp/v1/",
  },
  temperature: 0.0,
  repeatLastN: 2,
  repeatPenalty: 2.2,
  topK: 10,
  topP: 0.5,
})


let systemInstructions = `Your name is Bob.
You are the manager of the techfusion event. 
Use only the below CONTEXT to answer questions and provide information.
`

// Load the context from a file: techfusion.xml
let eventContext = fs.readFileSync('techfusion.xml', 'utf8')

const fastify = Fastify({ logger: true })

// Initialize a Map to store conversations by session
const conversationMemory = new Map()

// Helper function to get or create a conversation history
function getConversationHistory(sessionId, maxTurns = 10) {
  if (!conversationMemory.has(sessionId)) {
    conversationMemory.set(sessionId, [])
  }
  return conversationMemory.get(sessionId)
}

// Helper function to add a message to the conversation history
function addToHistory(sessionId, role, content) {
  const history = getConversationHistory(sessionId)
  history.push([role, content])
  
  // Keep only the last maxTurns conversations
  const maxTurns = 10 // Adjust this value based on your needs
  if (history.length > maxTurns * 2) { // *2 because each turn has user & assistant message
    history.splice(0, 2) // Remove oldest turn (user + assistant messages)
  }
}

// CORS activation
fastify.register(fastifyCors, {
  origin: true,
  methods: ['POST']
})

// Chat endpoint
fastify.post('/chat', async (request, reply) => {

  const { message: userMessage, sessionId = 'default' } = request.body
  fastify.log.info(`Message received for session ${sessionId}: ${userMessage}`)
  // Get conversation history for this session
  const history = getConversationHistory(sessionId)

  // Construct messages array with system instructions, context, history, and new message
  let messages = [
    ["system", systemInstructions],
    ["system", "CONTEXT:\n"+eventContext],
    ...history,
    ["user", userMessage]
  ]

  // Set appropriate headers for streaming
  reply.raw.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    let assistantResponse = ''
    const stream = await llm.stream(messages)
    
    for await (const chunk of stream) {
      // Accumulate the response
      assistantResponse += chunk.content
      // Send each chunk to the client
      reply.raw.write(chunk.content)
    }

    // Add both user message and assistant response to history
    addToHistory(sessionId, "user", userMessage)
    addToHistory(sessionId, "assistant", assistantResponse)

    // End the response
    reply.raw.end()
  } catch (error) {
    fastify.log.error(error)
    reply.raw.write('Error: ' + error.message)
    reply.raw.end()
  }

})

// Optional: Endpoint to clear conversation history
fastify.post('/clear-history', async (request, reply) => {
  const { sessionId = 'default' } = request.body
  conversationMemory.delete(sessionId)
  return { success: true, message: 'Conversation history cleared' }
})


// Start the HTTP server
let httpPort = process.env.PORT || 5050

const start = async () => {
  try {
    await fastify.listen({ port: httpPort, host: '0.0.0.0' })
    fastify.log.info(`Server started on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
