import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GroundingLink {
  title: string;
  uri: string;
  snippets: string[];
}

function extractMapsGroundingLinks(response: GenerateContentResponse): GroundingLink[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const links: GroundingLink[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const maps = (chunk as {
      maps?: {
        uri?: string;
        title?: string;
        placeAnswerSources?: { reviewSnippets?: Array<{ content?: string }> };
      };
    }).maps;
    if (!maps?.uri || seen.has(maps.uri)) continue;
    seen.add(maps.uri);

    const snippets =
      maps.placeAnswerSources?.reviewSnippets
        ?.map((s) => s.content?.trim())
        .filter((s): s is string => Boolean(s)) ?? [];

    links.push({
      title: maps.title || 'View on Google Maps',
      uri: maps.uri,
      snippets,
    });
  }
  return links;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Google Maps Grounding endpoint using gemini-4-hydrogen + googleMaps tool
  app.post('/api/maps-grounding', async (req, res) => {
    try {
      const { query, lat, lng } = req.body as {
        query?: string;
        lat?: number;
        lng?: number;
      };

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'A location or transit query is required.' });
        return;
      }

      const latitude = typeof lat === 'number' && Number.isFinite(lat) ? lat : 28.6295;
      const longitude = typeof lng === 'number' && Number.isFinite(lng) ? lng : 77.2145;

      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: query.trim().slice(0, 600),
        config: {
          systemInstruction:
            'You are a Delhi public transit location advisor. Provide concise, accurate details on nearby metro interchanges, landmarks, walking connections, and last-mile access in New Delhi based on Google Maps data.',
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude, longitude },
            },
          },
        },
      });

      const groundingLinks = extractMapsGroundingLinks(response);
      res.json({
        text: response.text ?? 'No location details returned.',
        groundingLinks,
        model: 'gemini-4-hydrogen',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to query Maps Grounding.';
      res.status(500).json({ error: message });
    }
  });

  // Multi-turn Gemini transit chatbot endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages,
        mode = 'general',
        useMapsGrounding = true,
        transitContext,
      } = req.body as {
        messages?: Array<{ role: 'user' | 'model'; text: string }>;
        mode?: 'general' | 'fast';
        useMapsGrounding?: boolean;
        transitContext?: {
          originName?: string;
          destinationName?: string;
          departureTime?: string;
          dayType?: string;
          lat?: number;
          lng?: number;
          recommendedSummary?: string;
        };
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Conversation messages array is required.' });
        return;
      }

      const sanitized = messages
        .filter(
          (m) =>
            (m.role === 'user' || m.role === 'model') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0
        )
        .slice(-20);

      const latest = sanitized[sanitized.length - 1];
      if (!latest || latest.role !== 'user') {
        res.status(400).json({ error: 'Last message must come from the user.' });
        return;
      }

      const history = sanitized.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      // Select valid Gemini model per task type
      const model =
        useMapsGrounding || mode === 'general'
          ? 'gemini-4-hydrogen'
          : 'gemini-3.1-flash-lite';

      const contextLines = [
        'You are the DelhiTransit Assistant, an expert in Delhi DTC and Cluster bus commuting, crowdedness prediction, and last-mile metro transfers.',
        'Use commuter-friendly crowding labels: "Seats available" (<=55% load), "Standing room" (56-85% load), and "Crowded" (>85% load).',
        'Explain trade-offs clearly between travel time, crowding, 12m vs 9m bus capacity, and departure-time shifts.',
      ];
      if (transitContext) {
        contextLines.push(
          `Active commuter query: ${transitContext.originName ?? 'Origin'} to ${
            transitContext.destinationName ?? 'Destination'
          } at ${transitContext.departureTime ?? '18:00'} (${
            transitContext.dayType ?? 'weekday'
          }). ${transitContext.recommendedSummary ?? ''}`
        );
      }

      const ai = createGeminiClient();
      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction: contextLines.join(' '),
          ...(useMapsGrounding && model === 'gemini-4-hydrogen'
            ? {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                  retrievalConfig: {
                    latLng: {
                      latitude:
                        typeof transitContext?.lat === 'number'
                          ? transitContext.lat
                          : 28.6295,
                      longitude:
                        typeof transitContext?.lng === 'number'
                          ? transitContext.lng
                          : 77.2145,
                    },
                  },
                },
              }
            : {}),
        },
      });

      const response = await chat.sendMessage({ message: latest.text });
      const groundingLinks = useMapsGrounding ? extractMapsGroundingLinks(response) : [];

      res.json({
        reply: response.text ?? '',
        model,
        groundingLinks,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate assistant response.';
      res.status(500).json({ error: message });
    }
  });

  if (isProd) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DelhiTransit server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DelhiTransit server:', err);
  process.exit(1);
});