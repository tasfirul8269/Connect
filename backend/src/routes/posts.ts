/// <reference path="../types/express.d.ts" />
import express from 'express';
import sql from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await sql`
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
        END as author_display_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      ORDER BY p.created_at DESC
    `;

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, image_url } = req.body;
    const userId = req.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const newPost = await sql`
      INSERT INTO posts (user_id, content, image_url)
      VALUES (${userId}, ${content}, ${image_url || null})
      RETURNING *
    `;

    res.status(201).json(newPost[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await sql`
      SELECT 
        p.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      WHERE p.user_id = ${userId}
      ORDER BY p.created_at DESC
    `;

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    // Check if already liked
    const existingLike = await sql`
      SELECT id FROM likes WHERE post_id = ${postId} AND user_id = ${userId}
    `;

    if (existingLike.length > 0) {
      return res.status(400).json({ error: 'Post already liked' });
    }

    // Add like
    await sql`
      INSERT INTO likes (post_id, user_id)
      VALUES (${postId}, ${userId})
    `;

    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike a post
router.delete('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    await sql`
      DELETE FROM likes WHERE post_id = ${postId} AND user_id = ${userId}
    `;

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const newComment = await sql`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (${postId}, ${userId}, ${content})
      RETURNING *
    `;

    res.status(201).json(newComment[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await sql`
      SELECT 
        c.*,
        u.email,
        u.account_type,
        CASE 
          WHEN u.account_type = 'personal' THEN CONCAT(pp.first_name, ' ', pp.last_name)
          ELSE op.organization_name
        END as author_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN personal_profiles pp ON u.id = pp.user_id AND u.account_type = 'personal'
      LEFT JOIN organization_profiles op ON u.id = op.user_id AND u.account_type = 'organization'
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
