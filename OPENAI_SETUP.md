# OpenAI Integration Setup

This application now uses OpenAI's GPT-4o-mini to intelligently extract meaningful Portuguese phrases from subtitle content.

## Setup Instructions

1. **Get an OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com)
   - Create an account or sign in
   - Go to API Keys section
   - Create a new API key

2. **Configure Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Features

### Intelligent Phrase Extraction
- Uses GPT-4o-mini to analyze Portuguese subtitle content
- Extracts meaningful, complete phrases (not fragments)
- Provides natural English translations
- Includes context and usage notes

### Fallback System
- If the OpenAI API is unavailable, the app falls back to basic extraction
- Ensures the application always works, even without API access

### Cost Optimization
- Uses GPT-4o-mini (cost-effective model)
- Limits content to 4000 characters per request
- Includes temperature control for consistent results

## API Usage

The phrase extraction endpoint (`/api/extract-phrases`) accepts:
- `content`: The Portuguese subtitle content
- `maxPhrases`: Maximum number of phrases to extract (default: 50)
- `language`: Language identifier (currently 'portuguese')

## Benefits Over Manual Algorithm

1. **Context Understanding**: AI understands the meaning and context
2. **Complete Phrases**: Extracts "Por um Portugal livre e melhor" instead of fragments
3. **Natural Translations**: Provides proper English equivalents
4. **Learning Focus**: Prioritizes phrases useful for language learners
5. **No Duplicates**: Intelligent deduplication based on meaning

## Error Handling

- API failures gracefully fall back to simple extraction
- Invalid responses are caught and handled
- User sees meaningful error messages
- Application continues to function without AI features