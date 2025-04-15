import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'

import * as fs from 'fs'

import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings} from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { readTextFilesRecursively } from './helpers.js'

import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { fetchTools, transformToLangchainTools } from "./mcp.helpers.js"

//! MCP
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// ---[BEGIN][Model Context Protocol]-------

//! ----------------------------------------------------------------
//! Create the MCP Client
//! ----------------------------------------------------------------
// Set up the SSE client transport
const bearerToken = process.env.BEARER_TOKEN;

// Set up the SSE client transport (with auth headers)
const transport = new SSEClientTransport(new URL(`${process.env.MCP_SERVER_BASE_URL}/sse`), {
  authProvider: {
    tokens: async () => {
      return {
        access_token: bearerToken,
      };
    }
  },
});

// Create the MCP Client
const mcpClient = new Client(
  {
    name: "mcp-sse-client",
    version: "1.0.0",
    auth: {
      type: "bearer",
      token: bearerToken,
    },
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
      logging: {},
    },
  }
);

await mcpClient.connect(transport);
console.log("🟢✅ Connected to MCP SSE Server!");

//! Fetch tools
let mcpTools = await fetchTools(mcpClient);
let langchainTools = transformToLangchainTools(mcpTools);

// ---[END][Model Context Protocol]-------


let modelRunnerURL = process.env.CHAT_URL


// Create the Model Runner Client for Chat
const llm = new ChatOpenAI({
  //model: process.env.CHAT_MODEL || "ai/llama3.2",
  model: process.env.CHAT_MODEL,
  apiKey: "",
  configuration: {
    baseURL: modelRunnerURL,
  },  
  temperature: parseFloat(process.env.OPTION_TEMPERATURE) || 0.0,
  repeat_last_n: parseInt(process.env.OPTION_REPEAT_LAST_N) || 2,
  repeat_penalty: parseFloat(process.env.OPTION_REPEAT_PENALTY) || 2.2,
  //top_k: parseInt(process.env.OPTION_TOP_K) || 10,
  topP: parseFloat(process.env.OPTION_TOP_P) || 0.5,
  //top_p: parseFloat(process.env.OPTION_TOP_P) || 0.5,
})

// Create the Model Runner Client for Embeddings
const llmEmbeddings = new OpenAIEmbeddings({
    model: process.env.EMBEDDINGS_MODEL,
    configuration: {
        baseURL: modelRunnerURL,
        apiKey: "sk-no-key-required"
    }
})

// ---[BEGIN][Create the embeddings]-------
console.log("========================================================")
console.log("🦜 Embeddings model:", llmEmbeddings.model)
console.log("📝 Creating embeddings...")
let contentPath = process.env.CONTENT_PATH || "../data"

// Create a "text splitter" to break the documents into smaller chunks
const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
  chunkSize: 512,
  chunkOverlap: 128,
})

// Read the text files recursively from the content path
let contentFromFiles = readTextFilesRecursively(contentPath, [".md"])

// Initialize the vector store
const vectorStore = new MemoryVectorStore(llmEmbeddings)

// Create the embeddings and add them to the vector store
const chunks = await splitter.createDocuments(contentFromFiles);
await vectorStore.addDocuments(chunks);

console.log("========================================================")

// ---[END][Create the embeddings]-------

// ---[START][Tool calling]-------
//! Create the Model Runner Client for Tools
const llmWithTools = llm.bindTools(langchainTools)
// ---[END][Tool calling]-------

// Load the system instructions
let systemInstructions = fs.readFileSync(process.env.SYSTEM_INSTRUCTIONS_PATH, 'utf8')

const fastify = Fastify({ logger: true })

// Initialize a Map to store conversations by session
const conversationMemory = new Map()

// CORS activation
fastify.register(fastifyCors, {
  origin: true,
  methods: ['POST']
})

//! ----------------------------------------------------------------
//! Chat endpoint
//! ----------------------------------------------------------------
fastify.post('/chat', async (request, reply) => {

  const { message: userMessage, sessionId = 'default' } = request.body
  fastify.log.info(`Message received for session ${sessionId}: ${userMessage}`)

  // Get conversation history for this session
  const history = getConversationHistory(sessionId)

  //? -------------------------------------------------
  //? Invoke tools
  //? Check if there are one or several tool calls
  //? -------------------------------------------------
  let systemMCPInstructions = `You are a useful AI agent. 
	Your job is to understand the user prompt and decide if you need to use tools to run external commands.
	Ignore all things not related to the usage of a tool.
	`
  let llmOutput = await llmWithTools.invoke([
    ["system", systemMCPInstructions],
    ["user",userMessage]
  ],{
    parallel_tool_calls: true
  })

  //? Detected tools and Invoke the tools
  let toolCallsResults = ""
  //console.log("🟢 Tool calls detection...")
  for (let toolCall of llmOutput.tool_calls) {
      console.log("- 🛠️ Tool:", toolCall.name, "Args:", toolCall.args)

      toolCallsResults += `### ${toolCall.name} ${toolCall.args}:\n`

      let result = await mcpClient.callTool({
        name: toolCall.name,
        arguments: toolCall.args,
      });
      toolCallsResults += `\n${JSON.stringify(result)}\n` 
  }

  let messages = []
  if (toolCallsResults.length > 0) {
    console.log("🟢 Tools calling: messages construction...")

    let systemMCPInstructions = `
    If you detect that the user prompt is related to a tool, i
    gnore this part and focus on the other parts.
    `

    messages = [
      ...history,
      ["system", systemInstructions],
      ["system", systemMCPInstructions],
      //["system", knowledgeBase],
      //["system", `Pizzerias addresses:\n${toolCallsResults}`], 
      ["system", toolCallsResults], 
      ["user", userMessage],
      //["user", "Display the above addresses. Add fancy and appropriate emojis."],
    ]
    
  } else { // normal chat
    console.log("🔵 Regular chat...")

    //? -------------------------------------------------
    //? Search for similarities
    //? -------------------------------------------------
    const similaritySearchResults = await vectorStore.similaritySearch(userMessage,2)
    console.log("🟠 [RAG] Similarity search...")

    let knowledgeBase = `KNOWLEDGE BASE:\n`
    for (const doc of similaritySearchResults) {
      console.log("📝",`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
      knowledgeBase += `${doc.pageContent}\n`
    }

    //? Construct messages array with:
    // system instructions, 
    // context, history, and new message
    messages = [
      ...history,
      ["system", systemInstructions],
      ["system", knowledgeBase],
      ["user", userMessage]
    ]

  }

  // Set appropriate headers for streaming
  reply.raw.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    let assistantResponse = ''
    const stream = await llm.stream(messages, {
      
    })
    
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

