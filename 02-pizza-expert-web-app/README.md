# Docker Model Runner with LangchainJS

## 🍍 The Hawaiian Pizza Guru 🍕

### Messages

```mermaid
graph TD
    subgraph Messages Array Construction
        H[Conversation History] --> M[Final Messages Array]
        S1[System Instructions<br>'Hawaiian pizza expert Bob'] --> M
        S2[Knowledge Base<br>'Traditional Ingredients<br>Regional Variations'] --> M
        U[User Message] --> M
    end

    subgraph Message Format
        M --> F["Array Format:<br>[...history,<br>['system', instructions],<br>['system', knowledgeBase],<br>['user', userMessage]]"]
    end

    style H fill:#f9f,stroke:#333,stroke-width:2px
    style S1 fill:#bbf,stroke:#333,stroke-width:2px
    style S2 fill:#bbf,stroke:#333,stroke-width:2px
    style U fill:#bfb,stroke:#333,stroke-width:2px
    style M fill:#fbb,stroke:#333,stroke-width:2px
    style F fill:#fff,stroke:#333,stroke-width:2px
```

### Architectures

```mermaid
graph LR
    %% Color definitions
    classDef frontendClass fill:#f9d71c,stroke:#333,stroke-width:2px
    classDef backendClass fill:#87ceeb,stroke:#333,stroke-width:2px
    classDef modelClass fill:#98fb98,stroke:#333,stroke-width:2px
    classDef dataClass fill:#ffa07a,stroke:#333,stroke-width:2px

    User((User))
    Frontend[Frontend<br/>Streamlit App<br/>Port 9090]:::frontendClass
    Backend[Backend<br/>Fastify Server<br/>Port 5050]:::backendClass
    LLM[LLM Service<br/>Model Runner<br/>LLaMA.cpp]:::modelClass
    KB[(Knowledge Base<br/>Hawaiian Pizza<br/>Facts)]:::dataClass

    User --> Frontend
    Frontend -->|HTTP POST /chat| Backend
    Backend -->|LangChain.js| LLM
    Backend -->|System Instructions| KB
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
Hello I'm Philippe
[As a poem] explain how to cook a pineapple pizza
# ok, give me the main ingredients
do you remember me?
```


Then try this in a terminal:

```bash
curl "http://localhost:5050/conversation?sessionId=default" | jq '.'
```

## Change the system instructions

```text
Speak like a pirate
```
