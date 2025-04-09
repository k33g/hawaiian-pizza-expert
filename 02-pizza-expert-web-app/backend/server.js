import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'

import { ChatOpenAI } from "@langchain/openai";


let modelBaseURL = process.env.MODEL_RUNNER_BASE_URL || "http://model-runner.docker.internal"
let engineEndPoint = "/engines/llama.cpp/v1/"

//! ----------------------------------------------------------------
//! Create the Model Runner Client
//! ----------------------------------------------------------------
const llm = new ChatOpenAI({
  model: process.env.LLM_CHAT || "ai/llama3.2",
  apiKey: "",
  configuration: {
    baseURL: modelBaseURL + engineEndPoint,
  },  
  temperature: parseFloat(process.env.OPTION_TEMPERATURE) || 0.0,
  repeat_last_n: parseInt(process.env.OPTION_REPEAT_LAST_N) || 2,
  repeat_penalty: parseFloat(process.env.OPTION_REPEAT_PENALTY) || 2.2,
  top_k: parseInt(process.env.OPTION_TOP_K) || 10,
  top_p: parseFloat(process.env.OPTION_TOP_P) || 0.5,
})

//! ----------------------------------------------------------------
//!  Instructions and Knowledge Base
//! ----------------------------------------------------------------
let systemInstructions = `
You are a Hawaiian pizza expert. Your name is Bob.
Provide accurate, enthusiastic information about Hawaiian pizza's history 
(invented in Canada in 1962 by Sam Panopoulos), 
ingredients (ham, pineapple, cheese on tomato sauce), preparation methods, and cultural impact.
Use a friendly tone with occasional pizza puns. 
Defend pineapple on pizza good-naturedly while respecting differing opinions. 
If asked about other pizzas, briefly answer but return focus to Hawaiian pizza. 
Emphasize the sweet-savory flavor combination that makes Hawaiian pizza special.
USE ONLY THE INFORMATION PROVIDED IN THE KNOWLEDGE BASE.
`

let knowledgeBase = `KNOWLEDGE BASE: 
## Traditional Ingredients
- Base: Traditional pizza dough
- Sauce: Tomato-based pizza sauce
- Cheese: Mozzarella cheese
- Key toppings: Ham (or Canadian bacon) and pineapple
- Optional additional toppings: Bacon, mushrooms, bell peppers, jalapeños

## Regional Variations
- Australia: "Hawaiian and bacon" adds extra bacon to the traditional recipe
- Brazil: "Portuguesa com abacaxi" combines the traditional Portuguese pizza (with ham, onions, hard-boiled eggs, olives) with pineapple
- Japan: Sometimes includes teriyaki chicken instead of ham
- Germany: "Hawaii-Toast" is a related open-faced sandwich with ham, pineapple, and cheese
- Sweden: "Flying Jacob" pizza includes banana, pineapple, curry powder, and chicken
`

const fastify = Fastify({ logger: true })

// Initialize a Map to store conversations by session
const conversationMemory = new Map()

// Helper function to get or create a conversation history
function getConversationHistory(sessionId, maxTurns = parseInt(process.env.HISTORY_MESSAGES)) {
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
  const maxTurns = parseInt(process.env.HISTORY_MESSAGES) // Adjust this value based on your needs
  if (history.length > maxTurns * 2) { // *2 because each turn has user & assistant message
    history.splice(0, 2) // Remove oldest turn (user + assistant messages)
  }
}

// CORS activation
fastify.register(fastifyCors, {
  origin: true,
  methods: ['POST']
})

//! ----------------------------------------------------------------
//!  Chat endpoint
//! ----------------------------------------------------------------
fastify.post('/chat', async (request, reply) => {

  const { message: userMessage, sessionId = 'default' } = request.body
  fastify.log.info(`Message received for session ${sessionId}: ${userMessage}`)
  
  // Get conversation history for this session
  const history = getConversationHistory(sessionId)


  // Construct messages array with: 
  // system instructions, 
  // context, history, and new message
  let messages = [
    ...history,
    ["system", systemInstructions],
    ["system", knowledgeBase],
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
    const stream = await llm.stream(messages, {})
    
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

// Endpoint to get conversation history
/*
curl "http://localhost:5050/conversation?sessionId=default"
curl "http://localhost:5050/conversation?sessionId=default" | jq '.'
*/
fastify.get('/conversation', async (request, reply) => {
  const { sessionId = 'default' } = request.query
  
  // Get conversation history for this session
  const history = getConversationHistory(sessionId)
  
  // Format the history as an array of objects
  const formattedHistory = []
  for (let i = 0; i < history.length; i += 2) {
    if (i + 1 < history.length) {
      formattedHistory.push({
        user: history[i][1],
        assistant: history[i + 1][1],
        timestamp: new Date().toISOString() // Ideally, you'd store timestamps with messages
      })
    } else {
      // In case there's an odd number of messages (shouldn't normally happen)
      formattedHistory.push({
        user: history[i][1],
        assistant: "",
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return formattedHistory
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
