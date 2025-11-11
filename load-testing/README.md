# Load Testing for Event Booking System

This directory contains load testing scripts for the event booking system using k6.

## Prerequisites

Before running the load tests, you need to install k6:

### Install k6

**On Windows:**
```bash
winget install k6
```

**On macOS:**
```bash
brew install k6
```

**On Linux:**
```bash
# Ubuntu/Debian
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --dearmor --output /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or using npm
npm install -g k6
```

## Running Load Tests

### Start the Application

Make sure the application is running:

```bash
# Using the development setup
docker-compose -f infrastructure/docker-compose.dev.yml up --build

# Or using the production setup
docker-compose -f infrastructure/docker-compose.prod.yml up --build
```

### Execute Load Tests

Run the booking system load test:

```bash
cd load-testing
npm run test:booking
```

Or run a stress test:

```bash
cd load-testing
npm run test:stress
```

Alternatively, run k6 directly:

```bash
k6 run booking-test.js
```

## Test Configuration

The load test configuration includes:

- **Stages**: Gradually increases virtual users from 50 to 200
- **Thresholds**: 
  - 95% of requests should complete within 2 seconds
  - Request failure rate should be less than 1%
- **Endpoints**: Tests the `/api/bookings/reserve` endpoint
- **Data**: Uses 10 different events with 100 seats each

## Performance Metrics

The load test will measure:

- Response time percentiles
- Request failure rate
- Throughput (requests per second)
- Virtual users over time

## Monitoring

During load testing, monitor the system using:

- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **NATS Monitoring**: http://localhost:8222

## Load Testing Results: Low Resources vs High Resources

We conducted load testing with two different resource configurations to analyze performance under different infrastructure conditions. The tests were run with identical k6 configurations but different Docker resource limits in the docker-compose.prod.yml file.

### Low Resource Configuration
- **API Gateway**: 256MB RAM, 0.25 CPU cores (limit), 128MB RAM, 0.125 CPU cores (reservation)
- **Booking Service**: 256MB RAM, 0.25 CPU cores (limit), 128MB RAM, 0.125 CPU cores (reservation)
- **PostgreSQL**: 256MB RAM, 0.25 CPU cores (limit), 128MB RAM, 0.125 CPU cores (reservation)
- **Other Services**: Proportionally low resource allocation

**Load Test Results (Low Resources)**:
- **Virtual Users**: 200
- **Duration**: 5 minutes
- **Successful checks**: 64,203
- **Requests per second**: 71.3
- **Average response time**: 1.66s
- **95th percentile response time**: 2.73s
- **Failed requests**: 0.0%
- **Result**: ❌ Threshold 'p(95)<2000' failed (2.73s > 2s)

### High Resource Configuration
- **API Gateway**: 2GB RAM, 2.0 CPU cores (limit), 1GB RAM, 1.0 CPU cores (reservation)
- **Booking Service**: 2GB RAM, 2.0 CPU cores (limit), 1GB RAM, 1.0 CPU cores (reservation)
- **PostgreSQL**: 4GB RAM, 2.0 CPU cores (limit), 2GB RAM, 1.0 CPU cores (reservation)
- **Other Services**: Proportionally high resource allocation

**Load Test Results (High Resources)**:
- **Virtual Users**: 200
- **Duration**: 5 minutes
- **Successful checks**: 254,553
- **Requests per second**: 282.6
- **Average response time**: 194.77ms
- **95th percentile response time**: 605.36ms
- **Failed requests**: 0.00%
- **Result**: ✅ Threshold 'p(95)<2000' passed (605.36ms < 2s)

### Performance Analysis

The comparison clearly shows the impact of resource allocation on system performance:
- **Throughput**: High resource configuration achieved ~4x higher throughput (282.6 vs 71.3 req/s)
- **Response Time**: High resource configuration achieved ~8x faster response times (avg 194.77ms vs 1.66s)
- **Scalability**: With adequate resources, the system maintained sub-1s response times under load
- **Efficiency**: The event-driven architecture with NATS messaging scales effectively when properly resourced
## Test Scripts

### booking-test.js
- **Purpose**: Standard load test with progressive load increase
- **Duration**: ~26 minutes
- **Peak Users**: 20 concurrent users
- **Configuration**:
  - 2 minutes: Ramp up to 50 users
  - 5 minutes: Stay at 50 users
  - 2 minutes: Ramp up to 100 users
  - 5 minutes: Stay at 100 users
  - 2 minutes: Ramp up to 200 users
  - 5 minutes: Stay at 200 users
  - 2 minutes: Ramp down to 0 users

### booking-test-short.js (Updated)
- **Purpose**: High load test with rapid scale-up
- **Duration**: ~10 minutes
- **Peak Users**: 10,000 concurrent users
- **Configuration**:
  - 1 minute: Ramp up to 2,000 users
  - 2 minutes: Stay at 2,000 users
  - 1 minute: Ramp up to 5,000 users
  - 2 minutes: Stay at 5,000 users
  - 1 minute: Ramp up to 10,000 users
 - 2 minutes: Stay at 10,000 users
  - 1 minute: Ramp down to 0 users
- **Thresholds**: 95% of requests under 3s, 99% under 5s, failure rate < 2%

### booking-test-high-load.js
- **Purpose**: Dedicated high load test with 10,000 users
- **Duration**: ~10 minutes
- **Peak Users**: 10,000 concurrent users
- **Configuration**:
  - 1 minute: Ramp up to 2,000 users
  - 2 minutes: Stay at 2,000 users
  - 1 minute: Ramp up to 5,000 users
  - 2 minutes: Stay at 5,000 users
 - 1 minute: Ramp up to 10,000 users
 - 2 minutes: Stay at 10,000 users
  - 1 minute: Ramp down to 0 users
- **Thresholds**: 95% of requests under 3s, 99% under 5s, failure rate < 2%
- **Features**: Custom metrics, realistic event data, user pools

## Running Tests

### Package.json Scripts
- `npm run test:booking` - Run standard booking test
- `npm run test:stress` - Run stress test with 100 VUs for 30s
- `npm run test:booking-short` - Run short high-load test (10,000 users)
- `npm run test:high-load` - Run dedicated high-load test (10,000 users)

### Manual Execution
```bash
# Run with default configuration
k6 run booking-test-high-load.js

# Run with custom options
k6 run --vus 1000 --duration 5m booking-test.js

# Run with output to JSON
k6 run --out json=results.json booking-test-high-load.js
```

## Performance Thresholds

- **Response Time**: 95% of requests should complete within 3 seconds, 99% within 5 seconds
- **Failure Rate**: Less than 2% of requests should fail
- **Throughput**: System should handle expected concurrent users without degradation

## Monitoring and Metrics

The load tests include custom metrics to track:
- Response time percentiles (p95, p99)
- Request failure rates
- Custom failure tracking
- System resource utilization (when integrated with monitoring)

## System Requirements for High Load Testing

Running tests with 10,000 virtual users requires:
- At least 8GB RAM on the test machine
- Multiple CPU cores for optimal performance
- Network capacity to handle high request volume
- Adequate disk space for result logs

## Best Practices

1. Always test against a staging environment that mirrors production
2. Monitor system resources during tests
3. Gradually increase load to identify breaking points
4. Run tests multiple times to ensure consistency
5. Clean up resources after tests complete
6. Document results and compare with baseline metrics