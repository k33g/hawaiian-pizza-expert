# Docker Model Runner with LangchainJS

## 🍍 The Hawaiian Pizza Guru 🍕 [Tools edition]


### Workflow

```mermaid
graph TD
    %% Style definitions
    classDef inputClass fill:#f9d71c,stroke:#333,stroke-width:2px
    classDef processClass fill:#87ceeb,stroke:#333,stroke-width:2px
    classDef toolClass fill:#ffccbc,stroke:#bf360c,stroke-width:2px
    classDef vectorClass fill:#b2dfdb,stroke:#004d40,stroke-width:2px
    classDef outputClass fill:#98fb98,stroke:#333,stroke-width:2px

    %% Main Flow
    Request[HTTP Request<br/>message]:::inputClass
    ToolCheck{Tool Detection}:::processClass
    
    %% Tool Path
    Tools[Tool Execution]:::toolClass
    ToolResults[Tool Results]:::toolClass
    
    %% RAG Path
    Search[Similarity Search]:::vectorClass
    Context[Knowledge Context]:::vectorClass
    
    %% Response Generation
    Assembly[Message Assembly]:::processClass
    Stream[Stream Response]:::outputClass
    
    %% Flow Connections
    Request --> ToolCheck
    
    ToolCheck -->|Tool Detected| Tools
    Tools --> ToolResults
    ToolResults --> Assembly
    
    ToolCheck -->|No Tools| Search
    Search --> Context
    Context --> Assembly
    
    Assembly --> Stream
    
  
```

### Architecture

```mermaid
graph TD
    %% Color definitions
    classDef frontendClass fill:#f9d71c,stroke:#333,stroke-width:2px
    classDef backendClass fill:#87ceeb,stroke:#333,stroke-width:2px
    classDef modelClass fill:#98fb98,stroke:#333,stroke-width:2px
    classDef dataClass fill:#ffa07a,stroke:#333,stroke-width:2px
    classDef embeddingClass fill:#e1bee7,stroke:#4a148c,stroke-width:2px
    classDef vectorClass fill:#b2dfdb,stroke:#004d40,stroke-width:2px
    classDef toolClass fill:#ffccbc,stroke:#bf360c,stroke-width:2px

    %% User Layer
    User((User))

    %% Frontend Layer
    Frontend[Frontend<br/>Streamlit App<br/>Port 9090]:::frontendClass

    %% Backend Layer
    Backend[Backend<br/>Fastify Server<br/>Port 5050]:::backendClass

    %% Knowledge Processing Layer
    subgraph "Knowledge Processing"
        direction LR
        KB[(Markdown Files<br/>Knowledge Base)]:::dataClass
        Splitter[Text Splitter<br/>512 chunks]:::backendClass
        EmbeddingModel[Embedding Model<br/>MX BaiChat]:::embeddingClass
        VectorStore[(Memory<br/>Vector Store)]:::vectorClass
    end

    %% Tools Layer
    subgraph "Tools Processing"
        direction LR
        Tools[Tools Manager]:::toolClass
        PizzeriaFinder[Pizzeria Finder<br/>Tool]:::toolClass
    end

    %% LLM Layer
    LLM[Chat LLM<br/>LLaMA.cpp]:::modelClass

    %% Connections
    User --> Frontend
    Frontend -->|HTTP POST /chat| Backend
    
    %% Knowledge Flow
    KB --> Splitter
    Splitter --> EmbeddingModel
    EmbeddingModel --> VectorStore
    VectorStore -->|Context| Backend
    
    %% Tools Flow
    Backend -->|Tool Detection| Tools
    Tools --> PizzeriaFinder
    PizzeriaFinder -->|Results| Tools
    Tools -->|Tool Output| Backend
    
    %% LLM Flow
    Backend -->|Enhanced Prompt| LLM
    LLM -->|Streaming Response| Backend
    Backend -->|Chunked Response| Frontend
    Frontend -->|Display| User
```

Start the web application
```bash
docker compose up --build
#docker compose up --watch
```
Then, open: http://localhost:9090/

Conversational Chat with Bob
```text
give me pizzerias addresses in Paris
give me pizzerias addresses in Roma and Paris
give me pizzerias addresses in Warsaw
```
