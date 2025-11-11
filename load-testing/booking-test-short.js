import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the test - 1000 users over 2-5 minutes with ramp-up
export const options = {
 stages: [
     { duration: '30s', target: 500 },    // Ramp up to 500 users
     { duration: '30s', target: 1000 },   // Ramp up to 1000 users
     { duration: '60s', target: 1000 },   // Stay at 1000 users for 1 minute
     { duration: '60s', target: 0 },      // Ramp down to 0 users
  ],
   thresholds: {
     http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% of requests should complete within 3s, 99% within 5s
     http_req_failed: ['rate<0.05'],    // Request failure rate should be less than 5%
   },
  // Additional options for load scenarios
   discardResponseBodies: true,         // Discard response bodies to save memory during load
   userAgent: 'k6-load-tester/1.0',     // User agent for identification
   batch: 10,                           // Limit concurrent requests per VU
   batchPerHost: 10,                    // Limit concurrent requests per host
};

// Shared array of test data to be used across VUs - more realistic event data
const testData = new SharedArray('test-data', function () {
  const events = [];
  // Create more diverse event data for realistic testing
  for (let i = 1; i <= 100; i++) {
    // Generate events with different seat capacities to simulate real scenarios
    const seatCount = Math.floor(Math.random() * 900) + 100; // Between 100 and 1000 seats
    events.push({
      id: i,
      name: `Event ${i}`,
      total_seats: seatCount,
      venue: `Venue ${i % 20}`, // Group events by venue (20 different venues)
      category: ['Concert', 'Sports', 'Theater', 'Conference', 'Festival'][i % 5],
      date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // Different dates
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
  const isSuccess = check(response, {
    'booking successful': (r) => r.status === 201,
    'booking rejected (duplicate)': (r) => r.status === 409 || r.status === 201, // Allow both success and conflict (for duplicate bookings)
    'status is valid': (r) => r.status === 201 || r.status === 400 || r.status === 404 || r.status === 409,
  });
  
  // Log errors for debugging
  if (!isSuccess) {
    console.log(`Error: ${response.status} - ${response.body}`);
  }

  sleep(1);
}

// Optional: Setup and teardown functions
export function setup() {
  console.log('Starting booking system load test...');
  return { testStart: new Date() };
}

export function teardown(data) {
  console.log('Load test completed.');
  console.log(`Test started at: ${data.testStart}`);
}