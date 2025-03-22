# Smart API Gateway

A modern, intelligent API Gateway built with NestJS that leverages AI for smart routing, circuit breaking, and efficient microservice management.

## 🌟 Features

- **AI-Powered Routing**: TensorFlow.js model analyzes requests to determine optimal service routing
- **Circuit Breaking**: Prevents cascading failures by detecting and isolating failing services
- **Service Discovery**: Dynamically registers and discovers microservice instances
- **Redis Caching**: Improves performance with distributed caching
- **MongoDB Integration**: Stores service configurations and metrics
- **Intelligent Load Balancing**: Routes to the most appropriate service based on region and health
- **Monitoring**: Real-time metrics and performance monitoring

## 🏗️ Architecture

The Smart API Gateway consists of several interconnected modules:

```
src/
├── ai-routing/        # TensorFlow-based intelligent request analysis
├── api/               # API controllers that handle incoming requests
├── cache/             # Caching layer for improved performance
├── circuit-breaker/   # Service reliability and failure isolation
├── config/            # Application configuration
├── database/          # MongoDB schemas and connections
├── gateway/           # Core gateway routing functionality
├── microservices/     # Service registration and discovery
├── monitoring/        # Performance metrics and monitoring
├── redis/             # Redis connection management
└── utils/             # Shared utilities and helpers
```

## 🔄 Request Flow

1. **Request Entry**
   - Client makes a request to `/api/*`
   - `ApiController` handles the request and forwards to `SmartGatewayService`

2. **AI Service Selection**
   - `AiRoutingService` uses TensorFlow to analyze the request
   - Determines the appropriate service category (payment, order, user, product)

3. **Instance Selection**
   - `MicroservicesService` selects the best service instance based on:
     - Service type (from AI analysis)
     - Geographic region
     - Health metrics
     - Priority settings

4. **Circuit Breaking**
   - `CircuitBreakerService` checks if the selected service is healthy
   - Prevents calls to failing services
   - Manages recovery and testing of services

5. **Request Forwarding**
   - Request is forwarded to the selected service
   - Response is returned to the client
   - Metrics are recorded for future routing decisions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB
- Redis

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Vikas-Singh-10/smart-api-gateway/
cd smart-api-gateway
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration:
# MONGO_URI=mongodb://localhost:27017
# MONGO_DB_NAME=smart-api-gateway
# REDIS_HOST=localhost
# REDIS_PORT=6379
# PORT=3000
# ENCRYPTION_KEY=your-encryption-key
# AI_MODEL_PATH=./model
```

4. Register service instances:
```bash
npm run register-services
```

5. Start the development server:
```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`

## 🛠️ Development

### Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start the application in watch mode
- `npm run build` - Build the application
- `npm run register-services` - Register microservice instances
- `npm run test` - Run tests
- `npm run lint` - Lint the code

## 📚 API Usage

### Service Registration

Register a new service instance:

```bash
curl -X POST http://localhost:3000/microservices/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service-01",
    "type": "payment",
    "url": "https://payment-api.example.com",
    "region": "us-east-1",
    "apiKey": "your-api-key",
    "priority": 10,
    "isActive": true
  }'
```

### Making API Requests

All requests to your microservices are routed through:

```bash
curl -X ANY http://localhost:3000/api/your-endpoint \
  -H "X-Region: us-east-1" \
  -H "Content-Type: application/json" \
  -d '{"your": "payload"}'
```

The gateway will:
1. Analyze the request using AI
2. Select the appropriate service
3. Forward the request
4. Return the response

## 🔧 Configuration

### AI Model

- The AI model is stored in the `model` directory
- Initial model is created automatically if not found
- Can be trained with real traffic patterns for improved accuracy

### Circuit Breaker

Configure circuit breaker settings:

```bash
curl -X POST http://localhost:3000/circuit-breaker/configure \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "payment-service-01",
    "failureThreshold": 5,
    "resetTimeout": 30000,
    "failureWindow": 60000
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using NestJS, TensorFlow.js, MongoDB and Redis
