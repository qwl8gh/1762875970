import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the test
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Fast ramp up to 100 users
    { duration: '1m', target: 200 },   // Rapid ramp to 200 users  
    { duration: '2m', target: 200 },   // Stay at 200 users
    { duration: '1m', target: 0 },     // Quick ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2s
    http_req_failed: ['rate<0.01'],    // Request failure rate should be less than 1%
  },
};

// Shared array of test data to be used across VUs
const testData = new SharedArray('test-data', function () {
  const events = [];
  for (let i = 1; i <= 10; i++) {
    events.push({
      id: i,
      name: `Event ${i}`,
      total_seats: 100,
    });
  }
  return events;
});

export default function () {
  // Select a random event
  const randomEvent = testData[Math.floor(Math.random() * testData.length)];
  
  // Generate a unique user ID for this iteration
  const userId = `user_${__VU}_${__ITER}_${Date.now()}`;
  
  const payload = JSON.stringify({
    event_id: randomEvent.id,
    user_id: userId,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post('http://localhost/api/bookings/reserve', payload, params);
  
  // Check the response
  check(response, {
    'booking successful': (r) => r.status === 201,
    'booking rejected (duplicate)': (r) => r.status === 409 || r.status === 201,
    'status is valid': (r) => r.status === 201 || r.status === 400 || r.status === 404 || r.status === 409,
  });

  sleep(0.3); // Further reduced sleep to handle higher user load
}