type ChatCompletionMessage = {
  role: string;
  content: string;
};

type ChatCompletionParams = {
  model: string;
  messages: ChatCompletionMessage[];
  max_completion_tokens?: number;
  response_format?: {
    type?: string;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const baseUrl =
    process.env.GEMINI_BASE_URL ??
    "https://generativelanguage.googleapis.com/v1beta";

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY.",
    );
  }

  return { apiKey, baseUrl };
}

async function createChatCompletion(params: ChatCompletionParams) {
  const { apiKey, baseUrl } = getGeminiConfig();
  const userPrompt = params.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");

  if (!userPrompt) {
    throw new Error("Gemini request must include at least one user message.");
  }

  const response = await fetch(
    `${baseUrl}/models/${params.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          ...(params.max_completion_tokens
            ? { maxOutputTokens: params.max_completion_tokens }
            : {}),
          ...(params.response_format?.type === "json_object"
            ? { responseMimeType: "application/json" }
            : {}),
        },
      }),
    },
  );

  const payload = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini request failed with status ${response.status}.`);
  }

  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

export const openai = {
  chat: {
    completions: {
      create: createChatCompletion,
    },
  },
};
