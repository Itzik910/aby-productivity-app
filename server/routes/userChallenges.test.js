const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  }
}));

jest.mock('../models/UserChallenge', () => {
  const find = jest.fn();
  const findOne = jest.fn();
  const findOneAndUpdate = jest.fn();
  const findOneAndDelete = jest.fn();
  const UserChallenge = jest.fn();

  UserChallenge.find = find;
  UserChallenge.findOne = findOne;
  UserChallenge.findOneAndUpdate = findOneAndUpdate;
  UserChallenge.findOneAndDelete = findOneAndDelete;

  return UserChallenge;
});

const UserChallenge = require('../models/UserChallenge');
const userChallengesRouter = require('./userChallenges');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/user-challenges', userChallengesRouter);
  return app;
};

const createChallengeDoc = (overrides = {}) => {
  const doc = {
    _id: 'challenge-1',
    title: 'Read daily',
    description: 'Read for 20 minutes each day',
    user: 'user-123',
    save: jest.fn()
  };

  doc.save.mockResolvedValue(doc);
  return { ...doc, ...overrides };
};

describe('user-challenges routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the authenticated user challenges with filters applied', async () => {
    const challenges = [{ _id: 'challenge-1', title: 'Read daily' }];
    const populateMock = jest.fn().mockResolvedValue(challenges);
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock });

    UserChallenge.find.mockReturnValue({
      sort: sortMock,
      populate: populateMock
    });

    const app = buildApp();

    const response = await request(app)
      .get('/api/user-challenges?status=active&category=health&type=habit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      challenges
    });
    expect(UserChallenge.find).toHaveBeenCalledWith({
      user: 'user-123',
      status: 'active',
      category: 'health',
      type: 'habit'
    });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(populateMock).toHaveBeenCalledWith('linkedTasks', 'title status');
  });

  it('creates a challenge for the authenticated user', async () => {
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const createdChallenge = {
      _id: 'challenge-2',
      title: 'Walk daily',
      description: 'Walk 10k steps every day',
      user: 'user-123',
      save: saveMock
    };

    UserChallenge.mockImplementationOnce((data) => ({
      ...createdChallenge,
      ...data,
      save: saveMock
    }));

    const app = buildApp();
    const payload = {
      title: 'Walk daily',
      description: 'Walk 10k steps every day',
      type: 'fitness',
      category: 'health',
      duration: 14,
      target: {
        value: 1,
        unit: 'times',
        frequency: 'daily'
      },
      startDate: '2026-06-02T00:00:00.000Z',
      endDate: '2026-06-16T00:00:00.000Z'
    };

    const response = await request(app)
      .post('/api/user-challenges')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      challenge: expect.objectContaining({
        title: payload.title,
        description: payload.description,
        user: 'user-123'
      })
    });
    expect(UserChallenge).toHaveBeenCalledWith({
      ...payload,
      user: 'user-123'
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('updates challenge progress for the authenticated user', async () => {
    const updateProgressMock = jest.fn().mockResolvedValue(undefined);
    const challenge = {
      _id: 'challenge-3',
      title: 'Meditate daily',
      updateProgress: updateProgressMock
    };

    UserChallenge.findOne.mockResolvedValue(challenge);

    const app = buildApp();
    const response = await request(app)
      .post('/api/user-challenges/challenge-3/progress')
      .send({ value: 2, notes: 'Felt focused' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      challenge: expect.objectContaining({
        _id: 'challenge-3',
        title: 'Meditate daily'
      })
    });
    expect(UserChallenge.findOne).toHaveBeenCalledWith({
      _id: 'challenge-3',
      user: 'user-123'
    });
    expect(updateProgressMock).toHaveBeenCalledWith(2, 'Felt focused');
  });
});
