const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String
    },
    author: {
        type: String,
        default: 'LuciusAI Team'
    },
    category: {
        type: String,
        default: 'Government Contracting'
    },
    tags: [String],
    isPublished: {
        type: Boolean,
        default: true
    },
    publishedAt: {
        type: Date,
        default: Date.now
    },
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
