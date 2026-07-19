const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Habit = require('../models/Habit');

// @route   GET /api/habits
// @desc    Get all active habits for user
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id, isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, habits });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/habits
// @desc    Create a new habit
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, frequency, category, color, emoji, daysOfWeek, preferredTime } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const habit = new Habit({
      user: req.user.id,
      title,
      description,
      frequency: frequency || 'daily',
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      preferredTime: preferredTime || '',
      category: category || 'personal',
      color: color || '#7c3aed',
      emoji: emoji || '⭐',
    });

    await habit.save();
    res.status(201).json({ success: true, habit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/habits/:id/complete
// @desc    Mark a habit as completed for today
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user.id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const today = new Date().toISOString().split('T')[0];
    if (!habit.completedDates.includes(today)) {
      habit.completedDates.push(today);
      habit.recalculateStreaks();
      await habit.save();
    }

    res.json({ success: true, habit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/habits/:id/complete
// @desc    Undo today's completion
router.delete('/:id/complete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user.id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const today = new Date().toISOString().split('T')[0];
    habit.completedDates = habit.completedDates.filter((d) => d !== today);
    habit.recalculateStreaks();
    await habit.save();

    res.json({ success: true, habit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/habits/:id
// @desc    Update a habit
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = ['title', 'description', 'frequency', 'category', 'color', 'emoji', 'isActive'];
    const update = {};
    updates.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, update, { new: true });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    res.json({ success: true, habit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/habits/:id
// @desc    Delete a habit
router.delete('/:id', auth, async (req, res) => {
  try {
    await Habit.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
