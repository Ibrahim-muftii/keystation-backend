export const assistantObject = {
  name: "Keystation Assistant",
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are the Keystation assistant. Help users with their questions about services, products, and support. Be concise and helpful."
      }
    ]
  },
  voice: {
    provider: "vapi",
    voiceId: "Spencer",
  },
  firstMessage: "Hi there! Welcome to Keystation. How can I assist you today?",
  transcriber: {
    provider: "deepgram",
    model: "nova",
    language: "en",
  },
  language: "en",
}