import { NextRequest, NextResponse } from "next/server";

interface PhraseExtractionRequest {
  content: string;
  language: string;
}

interface ExtractedPhrase {
  phrase: string;
  translation: string;
  frequency?: number;
}

// Define the JSON schema for structured outputs
const phraseExtractionSchema = {
  type: "object",
  properties: {
    phrases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: {
            type: "string",
            description: "The exact Portuguese phrase",
          },
          translation: {
            type: "string",
            description: "Natural English translation",
          },
        },
        required: ["phrase", "translation"],
        additionalProperties: false,
      },
    },
  },
  required: ["phrases"],
  additionalProperties: false,
} as const;

export async function POST(request: NextRequest) {
  try {
    const { content, language }: PhraseExtractionRequest = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are a Portuguese language learning expert. Analyze the following Portuguese subtitle content and extract ALL useful phrases for language learners. Be extremely comprehensive and thorough - extract as many valuable learning phrases as possible.

For each phrase, provide:
1. The exact Portuguese phrase (preserve original capitalization and structure)
2. A natural English translation

Extract EVERYTHING useful including:
- Complete sentences and meaningful phrases
- Common expressions, idioms, and sayings
- Conversational phrases and responses
- Colloquialisms and everyday language
- Question forms, exclamations, and responses
- Emotional expressions and reactions
- Transitional phrases and connectors
- Greetings, farewells, and social expressions
- Commands, requests, and suggestions
- Time expressions and descriptive phrases
- Short but meaningful phrases (3+ words)
- Interjections and common Portuguese exclamations
- Verb phrases and common constructions
- Adjective phrases that are commonly used
- Any phrase pattern that would help someone learning Portuguese

Only avoid:
- Isolated single words (unless they're meaningful interjections like "Nossa!" or "Puxa!")
- Incomplete fragments that don't make grammatical sense
- Highly technical jargon
- Proper nouns unless they're part of common expressions

IMPORTANT: Be extremely thorough. Extract hundreds of phrases if they exist in the content. This is for dedicated language learners who want maximum exposure to authentic Portuguese. Don't hold back - extract everything that could be useful for learning.

Content:
${content}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Updated to supported model
        messages: [
          {
            role: "system",
            content:
              "You are a helpful Portuguese language learning assistant. Extract useful phrases from the provided content according to the specified criteria.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.3,
        max_tokens: 32000, // Maximum for GPT-4o-mini (128k context, 16k output)
        // Use structured outputs instead of manual JSON parsing
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "phrase_extraction_response",
            strict: true,
            schema: phraseExtractionSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to process with OpenAI API" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Check for refusal (safety mechanism)
    if (data.choices?.[0]?.message?.refusal) {
      console.error(
        "OpenAI refused the request:",
        data.choices[0].message.refusal
      );
      return NextResponse.json(
        { error: "Request was refused by OpenAI for safety reasons" },
        { status: 400 }
      );
    }

    // Check if the response was truncated due to max_tokens limit
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      console.warn("Response was truncated due to token limit");
      // We'll still try to parse what we got, but log this for monitoring
    }

    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    // With structured outputs, we can directly parse the JSON without cleaning
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content_text);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content_text);
      console.error("Parse error:", parseError);

      // If parsing fails due to truncation, try to handle it gracefully
      if (finishReason === "length") {
        // Try to find the last complete phrase entry
        const lastCompleteEntry = content_text.lastIndexOf('{"phrase":');
        if (lastCompleteEntry > 0) {
          // Find the closing of the phrases array before the truncation
          const beforeLastEntry = content_text.substring(0, lastCompleteEntry);
          const lastComma = beforeLastEntry.lastIndexOf(",");

          if (lastComma > 0) {
            // Reconstruct valid JSON by closing the array and object
            const repairedJson = beforeLastEntry.substring(0, lastComma) + "]}";
            try {
              parsedResponse = JSON.parse(repairedJson);
            } catch (repairError) {
              console.error("Failed to repair truncated JSON:", repairError);
            }
          }
        }
      }

      if (!parsedResponse) {
        return NextResponse.json(
          {
            error: "Failed to parse OpenAI response",
            truncated: finishReason === "length",
            suggestion:
              finishReason === "length"
                ? "Try reducing maxPhrases or content size"
                : undefined,
          },
          { status: 500 }
        );
      }
    }

    // Validate the response structure (should always be valid with structured outputs)
    if (!parsedResponse.phrases || !Array.isArray(parsedResponse.phrases)) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    // Filter and validate phrases (extra safety, though structured outputs should ensure this)
    const validPhrases = parsedResponse.phrases.filter(
      (phrase: any) =>
        phrase.phrase &&
        phrase.translation &&
        typeof phrase.phrase === "string" &&
        typeof phrase.translation === "string" &&
        phrase.phrase.trim().length > 5
    );

    return NextResponse.json({
      phrases: validPhrases,
      total: validPhrases.length,
      truncated: finishReason === "length",
      message:
        finishReason === "length"
          ? "Response was truncated. Consider reducing maxPhrases or content size for complete results."
          : undefined,
    });
  } catch (error) {
    console.error("Error in extract-phrases API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
