# Docker Model Runner with LangchainJS

## 🍍 The Hawaiian Pizza Guru 🍕 [RAG edition]

### Workflow
```mermaid
sequenceDiagram
    participant User
    participant App as Application
    participant VDB as "In-Memory Vector DB"
    participant LLM

    Note over App: At startup
    App->>App: Chunk documents from /data
    App->>VDB: Store chunks as vectors

    Note over User,LLM: When user asks a question
    User->>App: Send question
    App->>VDB: Search for similarities
    VDB-->>App: Return relevant chunks
    
    App->>App: Create message set with:
    Note right of App: - System instructions<br>- Similar chunks<br>- User question
    
    App->>LLM: Send messages
    LLM-->>App: Generate response
    App-->>User: Show response
```

### Architecture
```mermaid
graph LR
    %% Color definitions
    classDef frontendClass fill:#f9d71c,stroke:#333,stroke-width:2px
    classDef backendClass fill:#87ceeb,stroke:#333,stroke-width:2px
    classDef modelClass fill:#98fb98,stroke:#333,stroke-width:2px
    classDef dataClass fill:#ffa07a,stroke:#333,stroke-width:2px
    classDef embeddingClass fill:#e1bee7,stroke:#4a148c,stroke-width:2px
    classDef vectorClass fill:#b2dfdb,stroke:#004d40,stroke-width:2px

    %% Nodes
    User((User))
    Frontend[Frontend<br/>Streamlit App<br/>Port 9090]:::frontendClass
    Backend[Backend<br/>Fastify Server<br/>Port 5050]:::backendClass
    LLM[Chat LLM<br/>LLaMA.cpp]:::modelClass
    KB[(Markdown Files<br/>Knowledge Base)]:::dataClass
    
    %% RAG Components
    Splitter[Text Splitter<br/> chunks]:::backendClass
    EmbeddingModel[Embedding Model<br/>MX BaiChat]:::embeddingClass
    VectorStore[(Memory<br/>Vector Store)]:::vectorClass
    
    %% Main Flow
    User --> Frontend
    Frontend -->|HTTP POST /chat| Backend
    Backend -->|LangChain.js| LLM
    LLM -->|Streaming Response| Backend
    Backend -->|Chunked Response| Frontend
    Frontend -->|Display| User
    
    %% RAG Flow
    KB -->|Load| Splitter
    Splitter -->|Chunks| EmbeddingModel
    EmbeddingModel -->|Vectors| VectorStore
    Backend -->|Similarity Search| VectorStore
    VectorStore -->|Context| Backend
```

Show content of: 
- `/data`
- `/docs`


Start the web application
```bash
docker compose up --build
#docker compose up --watch
```
Then, open: http://localhost:9090/

Conversational Chat with Bob
```text
Is Hawaiian pizza really from Hawaii?
Tell me about the history of the pineapple pizza 
Is there a regional variation of the hawaiian pizza in Brazil?
Give me the list of the regional variations
```

## LangchainJS

### How to Split code

- https://js.langchain.com/docs/how_to/code_splitter/

## Memory Vector Store

- MemoryVectorStore: https://js.langchain.com/docs/integrations/vectorstores/memory/

