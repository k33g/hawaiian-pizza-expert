#!/bin/sh
#set -e
export MODEL_RUNNER_URL=http://model-runner.docker.internal/engines/llama.cpp/v1/
export LLM=ai/llama3.2
export OPTION_TEMPERATURE=0.0
export OPTION_REPEAT_LAST_N=2
export OPTION_REPEAT_PENALTY=2.2
export OPTION_TOP_P=0.5
export OPTION_TOP_K=10

export HISTORY_MESSAGES=1
npm start
