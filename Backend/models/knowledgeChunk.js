const mongoose = require('mongoose');

const KnowledgeChunkSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        embedding: { type: [Number], required: true },
        source: { type: String, default: 'unknown' },
        page: { type: Number, default: 0 }
    },
    { timestamps: true }
);

const KnowledgeChunk = mongoose.model('knowledge_chunks', KnowledgeChunkSchema);

module.exports = KnowledgeChunk;
