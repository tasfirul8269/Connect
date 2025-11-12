"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../types/express.d.ts" />
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const optionalAuth_1 = require("../middleware/optionalAuth");
const socket_1 = require("../config/socket");
const router = express_1.default.Router();
// Helper to emit safely
const emit = (event, payload) => {
    const io = (0, socket_1.getIO)();
    if (io)
        io.emit(event, payload);
};
// Get all posts with counts, media, and viewer reaction
router.get('/', optionalAuth_1.optionalAuth, async (req, res) => {
    try {
        const viewerId = req.userId || null;
        const posts = await (0, database_1.default) `
      SELECT 
        p.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name,
        CASE 
          WHEN u.account_type = 'personal' THEN pp.first_name
          ELSE op.organization_name
        END as author_display_name,
        COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id), 0) as comments_count,
        COALESCE((SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id), 0) as reactions_count,
        COALESCE((SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like'), 0) as likes_count,
        (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ${viewerId} LIMIT 1) as viewer_reaction,
        COALESCE(
          (
            SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type) ORDER BY pm.sort_order, pm.created_at)
            FROM post_media pm WHERE pm.post_id = p.id
          ),
          '[]'::json
        ) AS media
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      ORDER BY p.created_at DESC
    `;
        res.json(posts);
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create a new post (supports multimedia)
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { content, image_url, video_url, audio_url, media_type, media } = req.body;
        const userId = req.userId;
        const hasLegacy = !!(image_url || video_url || audio_url);
        const mediaArr = Array.isArray(media) ? media : [];
        if ((!content || content.trim().length === 0) && !hasLegacy && mediaArr.length === 0) {
            return res.status(400).json({ error: 'Post must have text or media' });
        }
        const inferredType = mediaArr.length > 1 ? 'mixed' : (mediaArr[0]?.type || media_type || (image_url ? 'image' : video_url ? 'video' : audio_url ? 'audio' : 'text'));
        const rows = await (0, database_1.default) `
      INSERT INTO posts (user_id, content, image_url, video_url, audio_url, media_type)
      VALUES (${userId}, ${content || null}, ${image_url || null}, ${video_url || null}, ${audio_url || null}, ${inferredType || null})
      RETURNING *
    `;
        const post = rows[0];
        // Insert media records if provided
        if (mediaArr.length > 0) {
            for (let i = 0; i < mediaArr.length; i++) {
                const m = mediaArr[i];
                await (0, database_1.default) `INSERT INTO post_media (post_id, url, media_type, sort_order) VALUES (${post.id}, ${m.url}, ${m.type}, ${i})`;
            }
        }
        // Hydrate with author and media
        const [full] = await (0, database_1.default) `
      SELECT 
        p.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name,
        CASE 
          WHEN u.account_type = 'personal' THEN pp.first_name
          ELSE op.organization_name
        END as author_display_name,
        COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id), 0) as comments_count,
        COALESCE((SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id), 0) as reactions_count,
        COALESCE((SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like'), 0) as likes_count,
        (SELECT reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ${userId} LIMIT 1) as viewer_reaction,
        COALESCE(
          (
            SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type) ORDER BY pm.sort_order, pm.created_at)
            FROM post_media pm WHERE pm.post_id = p.id
          ),
          '[]'::json
        ) AS media
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      WHERE p.id = ${post.id}
      LIMIT 1
    `;
        emit('post:created', full);
        res.status(201).json(full);
    }
    catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get posts by user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await (0, database_1.default) `
      SELECT 
        p.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name,
        COALESCE(
          (
            SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type) ORDER BY pm.sort_order, pm.created_at)
            FROM post_media pm WHERE pm.post_id = p.id
          ),
          '[]'::json
        ) AS media
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      WHERE p.user_id = ${userId}
      ORDER BY p.created_at DESC
    `;
        res.json(posts);
    }
    catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// React to a post (Facebook-style)
router.post('/:postId/react', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        const { reaction_type } = req.body;
        const type = (reaction_type || 'like');
        // Upsert reaction
        await (0, database_1.default) `
      INSERT INTO reactions (post_id, user_id, reaction_type)
      VALUES (${postId}, ${userId}, ${type})
      ON CONFLICT (post_id, user_id)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
    `;
        const [{ total }] = await (0, database_1.default) `SELECT COUNT(*)::int as total FROM reactions WHERE post_id = ${postId}`;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM reactions WHERE post_id = ${postId} AND reaction_type = 'like'`;
        emit('reaction:updated', { postId, userId, reaction_type: type, likesCount: count, totalCount: total });
        res.json({ message: 'Reaction updated', likesCount: count, totalCount: total, reaction_type: type });
    }
    catch (error) {
        console.error('Error reacting to post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Clear reaction (equivalent to unlike when previous was like)
router.delete('/:postId/react', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `DELETE FROM reactions WHERE post_id = ${postId} AND user_id = ${userId}`;
        const [{ total }] = await (0, database_1.default) `SELECT COUNT(*)::int as total FROM reactions WHERE post_id = ${postId}`;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM reactions WHERE post_id = ${postId} AND reaction_type = 'like'`;
        emit('reaction:updated', { postId, userId, reaction_type: null, likesCount: count, totalCount: total });
        res.json({ message: 'Reaction cleared', likesCount: count, totalCount: total });
    }
    catch (error) {
        console.error('Error clearing reaction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Backward-compatible like/unlike endpoints
router.post('/:postId/like', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `
      INSERT INTO reactions (post_id, user_id, reaction_type)
      VALUES (${postId}, ${userId}, 'like')
      ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = 'like', created_at = NOW()
    `;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM reactions WHERE post_id = ${postId} AND reaction_type = 'like'`;
        emit('reaction:updated', { postId, userId, reaction_type: 'like', likesCount: count });
        res.json({ message: 'Post liked successfully', likesCount: count });
    }
    catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:postId/like', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `DELETE FROM reactions WHERE post_id = ${postId} AND user_id = ${userId}`;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM reactions WHERE post_id = ${postId} AND reaction_type = 'like'`;
        emit('reaction:updated', { postId, userId, reaction_type: null, likesCount: count });
        res.json({ message: 'Post unliked successfully', likesCount: count });
    }
    catch (error) {
        console.error('Error unliking post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add comment
router.post('/:postId/comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.userId;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        const newComment = await (0, database_1.default) `
      INSERT INTO comments (post_id, user_id, content)
      VALUES (${postId}, ${userId}, ${content})
      RETURNING *
    `;
        emit('comment:created', { postId, comment: newComment[0] });
        res.status(201).json(newComment[0]);
    }
    catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get comments for a post
router.get('/:postId/comments', optionalAuth_1.optionalAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const viewerId = req.userId || null;
        const comments = await (0, database_1.default) `
      SELECT 
        c.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name,
        COALESCE((SELECT COUNT(*) FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction_type = 'like'), 0) as likes_count,
        (SELECT reaction_type FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.user_id = ${viewerId} LIMIT 1) as viewer_reaction
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;
        res.json(comments);
    }
    catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// React to a comment
router.post('/:postId/comments/:commentId/react', auth_1.authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;
        const { reaction_type } = req.body;
        const type = (reaction_type || 'like');
        await (0, database_1.default) `
      INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
      VALUES (${commentId}, ${userId}, ${type})
      ON CONFLICT (comment_id, user_id)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
    `;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM comment_reactions WHERE comment_id = ${commentId} AND reaction_type = 'like'`;
        res.json({ message: 'Reaction updated', likesCount: count });
    }
    catch (error) {
        console.error('Error reacting to comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:postId/comments/:commentId/react', auth_1.authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `DELETE FROM comment_reactions WHERE comment_id = ${commentId} AND user_id = ${userId}`;
        const [{ count }] = await (0, database_1.default) `SELECT COUNT(*)::int as count FROM comment_reactions WHERE comment_id = ${commentId} AND reaction_type = 'like'`;
        res.json({ message: 'Reaction cleared', likesCount: count });
    }
    catch (error) {
        console.error('Error clearing comment reaction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Share a post
router.post('/:postId/share', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        const { shared_content } = req.body || {};
        const rows = await (0, database_1.default) `
      INSERT INTO post_shares (post_id, user_id, shared_content)
      VALUES (${postId}, ${userId}, ${shared_content || null})
      RETURNING *
    `;
        emit('post:shared', { postId, userId });
        res.status(201).json(rows[0]);
    }
    catch (error) {
        console.error('Error sharing post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Save / Unsave post
router.post('/:postId/save', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `
      INSERT INTO saved_posts (post_id, user_id)
      VALUES (${postId}, ${userId})
      ON CONFLICT (post_id, user_id) DO NOTHING
    `;
        res.json({ message: 'Saved' });
    }
    catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:postId/save', auth_1.authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.userId;
        await (0, database_1.default) `DELETE FROM saved_posts WHERE post_id = ${postId} AND user_id = ${userId}`;
        res.json({ message: 'Unsaved' });
    }
    catch (error) {
        console.error('Error unsaving post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map