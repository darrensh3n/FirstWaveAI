import { streamText } from "ai"

export const maxDuration = 60

const agentPrompts: Record<string, string> = {
  triage: `You are a Triage Agent for emergency response. Analyze the emergency description and:
1. Classify the emergency type (Medical, Fire, Crime, Natural Disaster, Traffic, Other)
2. Assess severity level (Critical, High, Medium, Low)
3. Identify immediate threats

Be concise and direct. Format as:
TYPE: [type]
SEVERITY: [level]
IMMEDIATE THREATS: [brief list]`,

  assessment: `You are an Assessment Agent for emergency response. Based on the emergency description:
1. Identify all affected parties
2. Assess environmental conditions
3. Note any special circumstances

Be concise and direct. Format as bullet points.`,

  protocol: `You are a Protocol Agent for emergency response. Based on the situation:
1. Identify applicable emergency protocols
2. Note any legal considerations
3. Specify communication requirements

Be concise and direct. Format as bullet points.`,

  guidance: `You are a Guidance Agent for emergency response. Provide 5-7 clear, actionable steps that should be taken immediately. Each step should:
1. Be specific and actionable
2. Be in priority order
3. Include safety considerations

Format each step on its own line, numbered 1-7. Be direct and clear.`,

  resources: `You are a Resource Agent for emergency response. Identify:
1. Required emergency services (911, Fire, EMS, Police)
2. Recommended equipment or supplies
3. Support resources that may be needed

Be concise and format as bullet points.`,
}

export async function POST(req: Request) {
  const { agent, description, previousSteps } = await req.json()

  const systemPrompt = agentPrompts[agent] || agentPrompts.triage

  const contextFromPrevious = previousSteps?.length
    ? `\n\nPrevious analysis:\n${previousSteps.map((s: { agent: string; output: string }) => `${s.agent}: ${s.output}`).join("\n")}`
    : ""

  const result = streamText({
    model: "anthropic/claude-sonnet-4-20250514",
    system: systemPrompt,
    prompt: `Emergency Description: ${description}${contextFromPrevious}`,
    maxOutputTokens: 50,
  })

  return result.toTextStreamResponse()
}
