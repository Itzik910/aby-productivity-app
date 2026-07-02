jest.mock('axios', () => ({
  get: jest.fn()
}));

const axios = require('axios');
const { getPlaceSuggestions } = require('./placeService');

describe('placeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it('returns deduped place suggestions based on home and work addresses', async () => {
    axios.get.mockImplementation((url, options) => {
      const query = options?.params?.query || '';
      const placeId = options?.params?.place_id || '';
      if (query.includes('Home')) {
        return Promise.resolve({
          data: {
            status: 'OK',
            results: [
              {
                name: 'Fresh Market',
                formatted_address: '123 Home St',
                rating: 4.6,
                price_level: 2,
                place_id: 'place-home'
              },
              {
                name: 'Corner Grocer',
                formatted_address: '124 Home St',
                rating: 4.4,
                place_id: 'place-home-2'
              }
            ]
          }
        });
      }

      if (query.includes('Work')) {
        return Promise.resolve({
          data: {
            status: 'OK',
            results: [
              {
                name: 'Fresh Market',
                formatted_address: '123 Work Ave',
                rating: 4.6,
                place_id: 'place-home'
              },
              {
                name: 'Office Eats',
                formatted_address: '125 Work Ave',
                rating: 4.3,
                place_id: 'place-work'
              }
            ]
          }
        });
      }

      if (placeId === 'place-home') {
        return Promise.resolve({
          data: {
            status: 'OK',
            result: {
              name: 'Fresh Market',
              formatted_address: '123 Home St',
              rating: 4.6,
              price_level: 2,
              place_id: 'place-home'
            }
          }
        });
      }

      if (placeId === 'place-work') {
        return Promise.resolve({
          data: {
            status: 'OK',
            result: {
              name: 'Office Eats',
              formatted_address: '125 Work Ave',
              rating: 4.3,
              price_level: 1,
              place_id: 'place-work'
            }
          }
        });
      }

      return Promise.resolve({
        data: {
          status: 'OK',
          results: []
        }
      });
    });

    const places = await getPlaceSuggestions(
      { title: 'Buy groceries', category: 'personal' },
      {
        addresses: {
          home: '123 Home St',
          work: '456 Work Ave'
        }
      }
    );

    expect(axios.get).toHaveBeenCalled();
    expect(places).toHaveLength(3);
    expect(places[0].name).toBe('Fresh Market');
    expect(places[0].costText).toBe('$$$');
    expect(places.some(place => place.name === 'Office Eats')).toBe(true);
  });
});
