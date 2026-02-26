import { createGatewayProvider } from "@ai-sdk/gateway";
import { streamText, UIMessage, convertToModelMessages, tool, ModelMessage, stepCountIs } from "ai";
import { z } from "zod";
import { fetchWeather } from "@/lib/fetchWeather";
import { setHistory, getHistory } from "@/lib/store";
import { TripCard, PackingList } from "@/lib/schemas";

const gatewayProvider = createGatewayProvider({
    apiKey: process.env.AI_GATEWAY_API_KEY
})

interface RequestBody {
  messages: UIMessage[];
  conversationId?: string | null;
  userId?: string | null;
}

const isTravelRelated = (input: string): boolean => {
    const travelKeywords = [
      'travel', 'trip', 'vacation', 'holiday', 'destination', 'city', 'country',
      'hotel', 'flight', 'packing', 'luggage', 'itinerary', 'tour', 'sightseeing',
      'beach', 'mountain', 'weather', 'climate', 'visa', 'passport', 'currency',
      'local', 'culture', 'food', 'restaurant', 'accommodation', 'transport',
      'safety', 'insurance', 'budget', 'plan', 'recommend', 'visit', 'go to',
      'best time', 'what to see', 'things to do', 'where to stay', 'how to get'
    ];
    
    const inputLower = input.toLowerCase();
    return travelKeywords.some(keyword => inputLower.includes(keyword));
};
  
const getOutOfScopeResponse = (): string => {
    const responses = [
        "I specialize in travel planning and destination advice. How can I help with your travel questions?",
        "As your travel companion, I focus on trips, destinations, and travel planning. What travel plans can I assist with?",
        "I'm here to help with travel-related questions like trip planning, packing, and destination advice. How can I assist with your travel needs?",
        "Let's focus on travel! I can help you plan trips, suggest destinations, or create packing lists.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
};

export async function POST(request:Request){
    try {

        if (!process.env.AI_GATEWAY_API_KEY) {
            return new Response(JSON.stringify({ error: "API configuration error" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const { messages, conversationId, userId }: RequestBody = await request.json();
        const finalConversationId = conversationId || crypto.randomUUID();

        const cleanedMessages = messages.filter((msg) => {
            if (msg.role === 'user') return true;
            // For assistant messages with tool calls, ensure all are complete
            if (msg.role === 'assistant' && Array.isArray(msg.parts)) {
                const hasIncompleteTools = msg.parts.some(part => {
                    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                      return 'state' in part && part.state !== 'output-available';
                    }
                    return false;
                });
              return !hasIncompleteTools;
            }
            
            return true;
        });

        // Convert UI messages to model messages
        const convertedMessages: ModelMessage[] = convertToModelMessages(cleanedMessages);
  
        //clean the ModelMessages to remove tool invocations
        const modelMessages = convertedMessages.map(msg => {
            if (msg.role === 'assistant' && 'toolInvocations' in msg) {
                const { toolInvocations, ...cleanMsg } = msg as any;
                return cleanMsg as ModelMessage;
            }
            return msg;
        });
  
        const prior: ModelMessage[] = await getHistory(finalConversationId) || [];
        const lastMessage = modelMessages[modelMessages.length - 1];
        if (lastMessage && typeof lastMessage.content === 'string') {
            const userInput = lastMessage.content.toLowerCase();
            if (!isTravelRelated(userInput)) {
                return new Response(JSON.stringify({
                    type: 'text',
                    text: getOutOfScopeResponse()
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-conversation-id': finalConversationId,
                    },
                });
            }
        }

        const response = streamText({
            model: gatewayProvider("openai/gpt-4o"),
            system: `You are TripMate, a travel assistant.
                By default, provide helpful travel advice in natural conversation.
                Use tools ONLY when user explicitly requests structured output:
                - "Create a trip card for X" → use create_trip_card
                - "Make me a packing list" → use create_packing_list  
                - "Check the weather" → use weather
                Otherwise, respond naturally with helpful travel information.
            `,
            messages: [...prior.slice(-20), ...modelMessages],
            tools: {
                weather: tool({
                    description: "Get weather for a city (°C) with short forecast",
                    inputSchema: z.object({
                        location: z.string().describe('City name, e.g., "Lagos"')
                    }),
                    async execute({ location }) {
                        console.log("Fetching weather for:", location);
                        try {
                            const data = await fetchWeather(location);
                            return data;
                        } catch (error) {
                            console.error("Weather fetch error:", error);
                            return { error: "Failed to fetch weather data" };
                        }
                    },
                }),
                create_trip_card: tool({
                    description: "Create a structured trip recommendation card with packing advice and cautions",
                    inputSchema: TripCard,
                    execute({ city, summary, packingAdvice, cautions }) {
                        return {
                            city,
                            summary,
                            packingAdvice,
                            cautions,
                            createdAt: new Date().toISOString()
                        };
                    },
                }),
                create_packing_list: tool({
                    description: "Create a detailed packing list with reasons for each item",
                    inputSchema: z.object({
                        items: PackingList.describe('Array of packing items with reasons')
                    }),
                    execute({items}) {
                        return {
                            items,
                            totalItems: items.length,
                            createdAt: new Date().toISOString()
                        };
                    },
                })
            },
            toolChoice: "auto",
            stopWhen: stepCountIs(10),
            onError({ error }) {
                console.error("Stream Error: ", error);
            },
        });

        return response.toUIMessageStreamResponse({
            originalMessages: messages,
            generateMessageId: () => crypto.randomUUID(),
            headers: {
              'x-conversation-id': finalConversationId,
            },
            onFinish: async ({ messages: allMessages }) => {
                const modelMessagesForStorage = allMessages
                .filter((msg): msg is UIMessage => msg.role === 'user' || msg.role === 'assistant')
                .map((msg): ModelMessage => {
                  // Extract text content from parts array
                  const textContent = msg.parts
                    .filter((part: any) => part.type === 'text')
                    .map((part: any) => part.text)
                    .join('');
                  
                  return {
                    role: msg.role,
                    content: textContent || msg.parts
                  } as ModelMessage;
                });
          
              await setHistory(
                finalConversationId, 
                modelMessagesForStorage, 
                userId || "anonymous"
              );
            }
        });
    } catch (error) {
        console.error("API Route Error:", error);
        return new Response(JSON.stringify(
            { 
                error: "Chat service temporarily unavailable",
                details: error instanceof Error ? error.message : "Unknown error"
            }
        ), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}


