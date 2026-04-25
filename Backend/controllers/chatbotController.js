const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const KnowledgeChunk = require('../models/knowledgeChunk');
const PackageModel = require('../models/package');
const ServiceModel = require('../models/service');

const MAX_HISTORY = 3;
const MAX_MESSAGE_CHARS = 500;
const MAX_TOKENS = 150;
const OFF_TOPIC_REPLY = "Sorry, I can't help you with that.";
const VECTOR_INDEX = process.env.MONGODB_VECTOR_INDEX || 'knowledgeIndex';
const VECTOR_CANDIDATES = 100;
const VECTOR_LIMIT = 5;

const TRAVEX_PROMPT_ID = 'pmpt_69e4a9003a4c8195923e2db164ea4f6208e21becb823361f';
const TRAVEX_PROMPT_VERSION = 'v6';

const faqData = [
    {
        category: 'Bookings',
        question: 'How do I book a tour package?',
        answer: 'Go to Destinations, choose a package, then follow the booking steps. You will receive a booking reference after submission.'
    },
    {
        category: 'Bookings',
        question: 'Can I cancel a booking?',
        answer: 'Yes. Open My Bookings, choose a booking, and submit a cancellation request with the required proof.'
    },
    {
        category: 'Payments',
        question: 'What payment methods are supported?',
        answer: 'Payments are processed through the available options shown during checkout. If you need help, contact support.'
    },
    {
        category: 'Quotations',
        question: 'How do I request a quotation?',
        answer: 'Use the quotation request page to submit your travel details. Our team will send a quote once reviewed.'
    },
    {
        category: 'Account',
        question: 'How do I reset my password?',
        answer: 'Use the Reset Password page and follow the instructions sent to your email.'
    },
    {
        category: 'Services',
        question: 'Do you offer visa and passport services?',
        answer: 'Yes. Visit the Services page for passport and visa assistance options.'
    },
    {
        category: 'Services',
        question: 'What documents do I need to prepare?',
        answer: 'Refer to the requirements section above for a general list. Specific services may have additional requirements.'
    },
    {
        category: 'Services',
        question: 'How long does the process take?',
        answer: 'Processing times vary by the DFA office and Embassy and the type of service you are applying for. After submission, you will receive updates on your application status.'
    },
    {
        category: 'Services',
        question: 'Can I reschedule my appointment?',
        answer: 'Rescheduling policies depend on the DFA office. If you need to change your appointment, please contact the DFA office directly.'
    }
];

const normalizeText = (text) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const extractKeywords = (text) =>
    normalizeText(text)
        .split(' ')
        .filter((word) => word.length >= 4);

const faqKeywords = new Set(
    faqData.flatMap((item) => [
        ...extractKeywords(item.category),
        ...extractKeywords(item.question),
        ...extractKeywords(item.answer)
    ])
);

const chunkText = (text, chunkSize = 1200, overlap = 200) => {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end).trim();

        if (chunk) {
            chunks.push(chunk);
        }

        start = end - overlap;
        if (start < 0) start = 0;
        if (start >= text.length) break;
    }

    return chunks;
};

const embeddingClient = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const getEmbedding = async (text) => {
    if (!embeddingClient) return null;
    const response = await embeddingClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
    });

    return response?.data?.[0]?.embedding || null;
};

const searchKnowledge = async (queryEmbedding) => {
    if (!queryEmbedding) return [];

    const results = await KnowledgeChunk.aggregate([
        {
            $vectorSearch: {
                index: VECTOR_INDEX,
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: VECTOR_CANDIDATES,
                limit: VECTOR_LIMIT
            }
        },
        {
            $project: {
                text: 1,
                source: 1,
                page: 1,
                score: { $meta: 'vectorSearchScore' }
            }
        }
    ]);

    return results;
};

const buildPackageContext = async (message) => {
    const normalized = normalizeText(message);
    const wantsPackages = /\b(package|packages|tour|tours|available|availability|price|rate|promo|deal)\b/.test(normalized);

    if (!wantsPackages) return { text: '', names: [] };

    const packages = await PackageModel.find({}, {
        packageName: 1,
        packagePricePerPax: 1,
        packageDuration: 1,
        packageType: 1,
        packageTags: 1
    })
        .sort({ packageName: 1 })
        .limit(5)
        .lean();

    if (!packages.length) return { text: 'No packages are currently available.', names: [] };

    const text = packages
        .map((pkg) => {
            const tags = Array.isArray(pkg.packageTags) && pkg.packageTags.length > 0
                ? ` Tags: ${pkg.packageTags.join(', ')}.`
                : '';
            const discount = pkg.packageDiscountPercent
                ? ` Discount: ${pkg.packageDiscountPercent}%.`
                : '';
            const visa = pkg.visaRequired === true ? ' Visa required.' : ' Visa not required.';
            const inclusions = Array.isArray(pkg.packageInclusions) && pkg.packageInclusions.length > 0
                ? ` Inclusions: ${pkg.packageInclusions.slice(0, 6).join(', ')}${pkg.packageInclusions.length > 6 ? ', ...' : ''}.`
                : '';
            const exclusions = Array.isArray(pkg.packageExclusions) && pkg.packageExclusions.length > 0
                ? ` Exclusions: ${pkg.packageExclusions.slice(0, 6).join(', ')}${pkg.packageExclusions.length > 6 ? ', ...' : ''}.`
                : '';
            return `- ${pkg.packageName} (${pkg.packageType}). ${pkg.packageDuration} day(s). Price per pax: ${pkg.packagePricePerPax}. Solo: ${pkg.packageSoloRate}. Child: ${pkg.packageChildRate}. Infant: ${pkg.packageInfantRate}.${discount}${visa}${tags}${inclusions}${exclusions}`;
        })
        .join('\n');

    return { text, names: packages.map((pkg) => pkg.packageName).filter(Boolean) };
};

const buildVisaServiceContext = async () => {
    const services = await ServiceModel.find({}, {
        visaName: 1,
        visaPrice: 1,
        visaRequirements: 1,
        visaAdditionalRequirements: 1
    })
        .sort({ visaName: 1 })
        .limit(5)
        .lean();

    if (!services.length) return { text: 'No visa services are currently available.', names: [] };

    const text = services
        .map((service) => {
            const reqs = Array.isArray(service.visaRequirements) && service.visaRequirements.length > 0
                ? service.visaRequirements
                    .slice(0, 6)
                    .map((req) => req.name || req.requirement || JSON.stringify(req))
                    .join(', ')
                : 'No listed requirements';
            const extraReqs = Array.isArray(service.visaAdditionalRequirements) && service.visaAdditionalRequirements.length > 0
                ? service.visaAdditionalRequirements
                    .slice(0, 4)
                    .map((req) => req.name || req.requirement || JSON.stringify(req))
                    .join(', ')
                : '';
            const extraNote = extraReqs ? ` Additional requirements: ${extraReqs}.` : '';
            return `- ${service.visaName}. Price: ${service.visaPrice}. Requirements: ${reqs}.${extraNote}`;
        })
        .join('\n');

    return { text, names: services.map((service) => service.visaName).filter(Boolean) };
};

const uploadKnowledge = async (req, res) => {
    try {
        if (!embeddingClient) {
            return res.status(500).json({ error: 'OPENAI_API_KEY is required for embeddings.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }

        const parsed = await pdfParse(req.file.buffer);
        const text = parsed?.text || '';
        const cleanedText = text.replace(/\s+/g, ' ').trim();

        if (!cleanedText) {
            return res.status(400).json({ error: 'Unable to extract text from PDF.' });
        }

        const chunks = chunkText(cleanedText);
        const source = req.file.originalname || 'uploaded.pdf';
        const inserted = [];

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            if (!embedding) continue;

            inserted.push({
                text: chunk,
                embedding,
                source
            });
        }

        if (!inserted.length) {
            return res.status(500).json({ error: 'Failed to create embeddings for PDF.' });
        }

        await KnowledgeChunk.insertMany(inserted);

        res.json({ message: 'PDF ingested successfully.', chunks: inserted.length });
    } catch (error) {
        console.error('PDF ingestion error:', error);
        res.status(500).json({ error: 'Failed to ingest PDF.' });
    }
};

const knowledgeStatus = async (_req, res) => {
    try {
        const count = await KnowledgeChunk.countDocuments();
        res.json({ chunks: count });
    } catch (error) {
        console.error('Knowledge status error:', error);
        res.status(500).json({ error: 'Failed to fetch knowledge status.' });
    }
};

const chatAction = async (req, res) => {

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://api.openai.com/v1",
    });


    try {
        const { messages } = req.body;
        const safeMessages = Array.isArray(messages)
            ? messages
                .filter((m) => typeof m?.role === 'string' && typeof m?.content === 'string')
                .map((m) => ({
                    role: m.role,
                    content: String(m.content).slice(0, MAX_MESSAGE_CHARS).trim()
                }))
                .filter((m) => m.content.length > 0)
            : [];

        if (safeMessages.length === 0) {
            return res.status(400).json({ error: 'No valid messages provided.' });
        }

        const recentMessages = safeMessages.slice(-MAX_HISTORY);
        const lastUserMessage = [...recentMessages].reverse().find((m) => m.role === 'user');

        if (!lastUserMessage) {
            return res.status(400).json({ error: 'No user message provided.' });
        }

        const userQuery = lastUserMessage.content;
        const queryEmbedding = await getEmbedding(userQuery);
        let knowledgeChunks = [];

        try {
            knowledgeChunks = await searchKnowledge(queryEmbedding);
        } catch (searchError) {
            console.error('Vector search error:', searchError);
        }

        const knowledgeContext = knowledgeChunks.length
            ? knowledgeChunks
                .map((chunk) => `Source: ${chunk.source} - ${chunk.text}`)
                .join('\n')
            : 'No relevant PDF context found.';

        let packageContext = '';
        try {
            const result = await buildPackageContext(userQuery);
            packageContext = result.text;
        } catch (packageError) {
            console.error('Package context error:', packageError);
        }

        let visaServiceContext = '';
        try {
            const result = await buildVisaServiceContext();
            visaServiceContext = result.text;
        } catch (serviceError) {
            console.error('Visa service context error:', serviceError);
        }

        const response = await openai.responses.create({
            prompt: {
                id: TRAVEX_PROMPT_ID
            },
            input: [
                {
                    role: "user",
                    content: [
                        "Context for this request:",
                        "FAQ list:",
                        ...faqData.map((item) => `- ${item.question} Answer: ${item.answer}`),
                        "PDF context:",
                        knowledgeContext,
                        "Available packages:",
                        packageContext || 'No package context requested.',
                        "Visa services:",
                        visaServiceContext || 'No visa service context available.'
                    ].join('\n')
                },
                ...recentMessages.map((m) => ({
                    role: m.role,
                    content: m.content
                }))
            ],
            max_output_tokens: 300,
            reasoning: { effort: 'low' },
            text: { verbosity: 'low' }
        });

        const reply = response?.output_text?.trim();

        if (!reply) {
            console.error("Empty response from OpenAI:", response);
            return res.status(502).json({ error: 'Empty response from AI provider.' });
        }

        res.json({ reply });
    } catch (error) {

        console.error("--- OPENAI API ERROR ---");
        console.error("Status:", error.status);
        console.error("Message:", error.message);
        console.error("-----------------------");

        let userFeedback = "The AI is having a moment. Try again?";

        if (error.status === 401) userFeedback = "Invalid OpenAI API Key.";
        if (error.status === 429) userFeedback = "Rate limit reached. Wait 60 seconds.";


        console.error("Error in OpenAI chatAction:", error.response?.data || error.message);

        if (error.status === 429) {
            return res.status(429).json({
                error: 'Too many requests. Please wait a moment before sending another message.'
            });
        }

        res.status(500).json({ error: 'The AI assistant is temporarily unavailable.' });
    }
};

module.exports = { chatAction, uploadKnowledge, knowledgeStatus };