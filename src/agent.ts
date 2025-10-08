import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { CompiledStateGraph } from "@langchain/langgraph";

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
});

const AgentOutputFormatSchema = z.object({
  numeric_answer: z.number().optional().describe("The numeric answer, if the user asked for one"),
  text_answer: z.string().optional().describe("The text answer, if the user asked for one"),
  reasoning: z.string().describe("The reasoning behind the answer"),
})

// Criar agente usando LangGraph (versão moderna)
export const agent: CompiledStateGraph<any, any, any> = createReactAgent({
    llm: model,
    tools: [],
    messageModifier: `Você é um assistente especializado em planejamento de viagens.
Seu objetivo é ajudar usuários a planejar viagens incríveis, fornecendo informações sobre:
- Destinos turísticos
- Melhores épocas para viajar
- Sugestões de roteiros
- Dicas de hospedagem e transporte
- Estimativas de custos

Seja prestativo, detalhado e considere sempre as preferências do usuário.`,
});

export type AgentOutput = z.infer<typeof AgentOutputFormatSchema>;