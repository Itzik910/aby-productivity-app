const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  }
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Task', () => ({
  find: jest.fn()
}));

jest.mock('../services/placeService', () => ({
  getPlaceSuggestions: jest.fn()
}));

const User = require('../models/User');
const Task = require('../models/Task');
const { getPlaceSuggestions } = require('../services/placeService');
const fixMyDayRouter = require('./fixMyDay');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/fix-my-day', fixMyDayRouter);
  return app;
};

describe('fix-my-day route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests when home and work addresses are missing', async () => {
    User.findById.mockResolvedValue({
      addresses: { home: '', work: '' }
    });

    const app = buildApp();
    const response = await request(app).post('/api/fix-my-day').send({
      preferredLocation: 'home',
      isWeekend: false
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/home and work addresses/i);
  });

  it('uses the chosen preferred location when generating a route', async () => {
    User.findById.mockResolvedValue({
      addresses: {
        home: '123 Home St',
        work: '456 Work Ave'
      }
    });

    Task.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: 'task-1',
          title: 'Buy groceries',
          location: { name: 'Market', address: '789 Market Rd' },
          estimatedDuration: 30,
          priority: 'high',
          dueDate: new Date('2026-06-02T12:00:00.000Z'),
          category: 'personal'
        }
      ])
    });
    getPlaceSuggestions.mockResolvedValue([
      {
        name: 'Fresh Market',
        address: '789 Market Rd',
        rating: 4.6,
        placeId: 'place-1',
        mapsUrl: 'https://maps.google.com/?q=fresh+market'
      }
    ]);

    const app = buildApp();
    const response = await request(app).post('/api/fix-my-day').send({
      preferredLocation: 'home',
      isWeekend: false
    });

    expect(response.status).toBe(200);
    expect(response.body.data.preferredLocation).toBe('home');
    expect(response.body.data.startPoint).toBe('123 Home St');
    expect(response.body.data.endPoint).toBe('123 Home St');
    expect(response.body.data.totalTasks).toBe(1);
    expect(response.body.data.tasks[0].recommendedPlaces).toHaveLength(1);
  });

  it('uses a home-to-work corridor for both mode on weekdays', async () => {
    User.findById.mockResolvedValue({
      addresses: {
        home: '123 Home St',
        work: '456 Work Ave'
      }
    });

    Task.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: 'task-1',
          title: 'Pick up dry cleaning',
          location: { name: 'Downtown', address: '10 Center Rd' },
          estimatedDuration: 20,
          priority: 'medium',
          dueDate: new Date('2026-06-02T12:00:00.000Z'),
          category: 'personal'
        }
      ])
    });

    const app = buildApp();
    const response = await request(app).post('/api/fix-my-day').send({
      preferredLocation: 'both',
      isWeekend: false
    });

    expect(response.status).toBe(200);
    expect(response.body.data.preferredLocation).toBe('both');
    expect(response.body.data.startPoint).toBe('123 Home St');
    expect(response.body.data.endPoint).toBe('456 Work Ave');
  });

  it('treats both as home when user works from home (same addresses)', async () => {
    User.findById.mockResolvedValue({
      addresses: {
        home: '123 Home St',
        work: '123 Home St'
      }
    });

    Task.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: 'task-2',
          title: 'Online meeting prep',
          location: { name: 'Home Office', address: '123 Home St' },
          estimatedDuration: 15,
          priority: 'high',
          dueDate: new Date('2026-06-03T10:00:00.000Z'),
          category: 'work'
        }
      ])
    });

    const app = buildApp();
    const response = await request(app).post('/api/fix-my-day').send({
      preferredLocation: 'both',
      isWeekend: false
    });

    expect(response.status).toBe(200);
    expect(response.body.data.startPoint).toBe('123 Home St');
    expect(response.body.data.endPoint).toBe('123 Home St');
  });

  it('filters tasks by selectedTaskIds when provided', async () => {
    User.findById.mockResolvedValue({
      addresses: { home: '10 Home Rd', work: '20 Work Ave' }
    });

    const allTasks = [
      { _id: 'task-A', title: 'Alpha', location: { name: 'A', address: 'A1' }, estimatedDuration: 20, priority: 'high', dueDate: new Date(), category: 'work' },
      { _id: 'task-B', title: 'Beta', location: { name: 'B', address: 'B1' }, estimatedDuration: 30, priority: 'low', dueDate: new Date(), category: 'work' },
    ];

    Task.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(allTasks)
    });

    const app = buildApp();
    const response = await request(app).post('/api/fix-my-day').send({
      preferredLocation: 'home',
      isWeekend: false,
      selectedTaskIds: ['task-A']
    });

    expect(response.status).toBe(200);
    // Should receive a Task.find call that included _id filter
    const findCall = Task.find.mock.calls[0][0];
    expect(findCall._id).toBeDefined();
    expect(findCall._id.$in).toContain('task-A');
  });
});
