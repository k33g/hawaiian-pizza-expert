import { ChatOpenAI } from "@langchain/openai";
import prompts from "prompts";

const llm = new ChatOpenAI({
  model: process.env.LLM || `ai/llama3.2`,
  apiKey: "",
  configuration: {
    baseURL: `${process.env.MODEL_RUNNER_BASE_URL}/engines/llama.cpp/v1/`,
  },
  temperature: 0.5,
  repeatPenalty: 2.2,
});

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


let exit = false;
while (!exit) {
  const { userQuestion } = await prompts({
    type: "text",
    name: "userQuestion",
    message: "🤖 Your question: ",
    validate: (value) => (value ? true : "😡 Question cannot be empty"),
  });

  if (userQuestion == "/bye") {
    console.log("👋 See you later!");
    exit = true;
  } else {

    let messages = [
        ["system", systemInstructions],
        ["system", knowledgeBase],
        ["user", userQuestion]
    ]
    
    const stream = await llm.stream(messages);
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n");
  }
}
