import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type Message = ChatCompletionMessageParam;

export const fetchNvidiaChatStream = async (
  apiKey: string,
  messages: Message[],
  modelId?: string,
) => {
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is missing");
  }
  console.log("\n\n\n apikey", apiKey);

  const openai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const completionParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
    model: modelId || "meta/llama-3.1-70b-instruct",
    messages,
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: true,
  };

  const stream = await openai.chat.completions.create(completionParams);

  return stream;
};
