package main

import (
	"os"

	"github.com/parakeet-nest/parakeet/completion"
	"github.com/parakeet-nest/parakeet/enums/option"
	"github.com/parakeet-nest/parakeet/enums/provider"
	"github.com/parakeet-nest/parakeet/llm"

	"fmt"
	"log"
)

func main() {
	modelRunnerURL := os.Getenv("MODEL_RUNNER_BASE_URL") + "/engines/llama.cpp/v1"

	options := llm.SetOptions(map[string]interface{}{
		option.Temperature:   0.5,
		option.RepeatPenalty: 3.0,
	})

	query := llm.Query{
		Model: "ai/mistral:latest",
		Messages: []llm.Message{
			{Role: "system", Content: `You are a Borg in Star Trek. Speak like a Borg`},
			{Role: "user", Content: `Who is Jean-Luc Picard?`},
		},
		Options: options,
	}

	_, err := completion.ChatStream(modelRunnerURL, query,
		func(answer llm.Answer) error {
			fmt.Print(answer.Message.Content)
			return nil
		}, provider.DockerModelRunner)
	
	fmt.Println()

	if err != nil {
		log.Fatal("😡:", err)
	}
}

