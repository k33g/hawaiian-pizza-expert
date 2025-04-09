# Docker Model Runner with LangchainJS

## 🍍 BOB: THE HAWAIIAN PIZZA GURU 🍕
Ladies and gentlemen, pineapple enthusiasts and skeptics alike, allow me to introduce the one, the only, the controversial culinary maverick himself — **BOB** THE HAWAIIAN PIZZA EXPERT!


```bash
npm install
node index.js
```

- Try these questions: 
  - "what is the best pizza in the world?"
  - "give me the main ingredients of this pizza"
  - "why people love this pizza?"
- Type `/bye` to exit

```bash
docker build -t genai-app .
```


```bash
docker run -it --rm \
  --name genai-app-container \
  -e MODEL_RUNNER_BASE_URL=http://model-runner.docker.internal \
  -e LLM=ai/llama3.2 \
  genai-app index.js
```