import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

// Custom metric to track failure rate
const failureRate = new Rate('failures');

// Configuration for high-load test - targeting 10,00 users in ~13 minutes with gradual ramp-up
export const options = {
  stages: [
    { duration: '2m', target: 1000 },    // Gradual ramp up to 1,000 users over 2 minutes
    { duration: '2m', target: 1000 },    // Stay at 1,000 users for 2 minutes
    { duration: '2m', target: 3000 },    // Ramp up to 3,000 users over 2 minutes
    { duration: '2m', target: 3000 },    // Stay at 3,000 users for 2 minutes
    { duration: '2m', target: 6000 },    // Ramp up to 6,000 users over 2 minutes
    { duration: '2m', target: 6000 },    // Stay at 6,000 users for 2 minutes
    { duration: '2m', target: 10000 },   // Ramp up to 10,000 users over 2 minutes
    { duration: '3m', target: 10000 },   // Stay at 10,000 users for 3 minutes
    { duration: '2m', target: 0 },       // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% of requests should complete within 3s, 99% within 5s
    http_req_failed: ['rate<0.05'],    // Request failure rate should be less than 5% (more lenient for high load)
    failures: ['rate<0.05'],           // Custom failure rate threshold (more lenient for high load)
  },
  // Additional options for high load scenarios
  discardResponseBodies: true,         // Discard response bodies to save memory during high load
  userAgent: 'k6-high-load-tester/1.0', // User agent for identification
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

// Shared array for user data to avoid creating unique IDs for each request
const userData = new SharedArray('user-data', function () {
  const users = [];
  // Pre-generate a pool of user IDs to simulate returning users
  for (let i = 0; i < 50000; i++) {
    users.push({
      id: `user_${i}`,
      name: `TestUser${i}`,
    });
  }
  return users;
});

export default function () {
  // Select a random event
  const randomEvent = testData[Math.floor(Math.random() * testData.length)];
  
  // Select a random user from the pool
  const randomUser = userData[Math.floor(Math.random() * Math.min(userData.length, __VU * 5 + __ITER)) % userData.length];
  
  // Generate a unique booking ID for this iteration
  const bookingId = `booking_${__VU}_${__ITER}_${Date.now()}`;
  
  const payload = JSON.stringify({
    event_id: randomEvent.id,
    user_id: randomUser.id,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Load-Test-ID': bookingId, // Add load test identifier for backend tracking
    },
  };

   const response = http.post('http://localhost/api/bookings/reserve', payload, params);
  
  // Check the response with more comprehensive validation
  const isSuccess = check(response, {
    'booking successful': (r) => r.status === 201,
    'booking rejected (duplicate)': (r) => r.status === 409 || r.status === 201, // Allow both success and conflict
    'status is valid': (r) => r.status === 201 || r.status === 400 || r.status === 404 || r.status === 409 || r.status === 429, // Include rate limit
    'response time acceptable': (r) => r.timings.duration < 5000, // Response under 5 seconds
  });
  
  // Track failures with custom metric
  failureRate.add(!isSuccess);
  
  // Log errors for debugging (only at certain intervals to avoid log flooding)
  if (!isSuccess && (__ITER % 10 === 0)) {
    console.log(`Error: ${response.status} - ${response.body} - VU: ${__VU}, Iter: ${__ITER}`);
  }

  // Add some variability to request timing to simulate real user behavior
  const randomSleep = Math.random() * 2 + 0.5; // Sleep between 0.5 and 2.5 seconds
  sleep(randomSleep);
}

// Optional: Setup and teardown functions
export function setup() {
  console.log('Starting high-load booking system load test with up to 10,000 concurrent users...');
  return { testStart: new Date(), totalVirtualUsers: options.stages[options.stages.length - 2].target };
}

export function teardown(data) {
  console.log('High-load test completed.');
  console.log(`Test started at: ${data.testStart}`);
  console.log(`Configured for up to ${data.totalVirtualUsers} concurrent users`);
  console.log('Performance metrics available in output and monitoring systems.');
}