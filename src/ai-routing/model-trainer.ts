import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main function to train the TensorFlow model for request routing
 */
async function trainModel() {
  console.log('Starting model training...');
  
  // Define model directory
  const modelDir = process.env.AI_MODEL_PATH || path.join(process.cwd(), 'model');
  if (!fs.existsSync(modelDir)) {
    console.log(`Creating model directory: ${modelDir}`);
    fs.mkdirSync(modelDir, { recursive: true });
  }

  // Build vocabulary map and save it
  const vocabMap = buildVocabulary();
  saveVocabulary(vocabMap, modelDir);
  
  // Generate training data
  const trainingData = generateTrainingData(vocabMap);
  console.log(`Generated ${trainingData.length} training examples`);
  
  // Prepare training tensors
  const xTrain = tf.tensor2d(trainingData.map(item => item.features));
  const yTrain = tf.oneHot(
    tf.tensor1d(trainingData.map(item => item.label), 'int32'), 
    5  // 5 classes (4 gateways + default)
  );
  
  // Create and compile model
  const model = createModel();
  
  // Train the model
  console.log('Training model...');
  await model.fit(xTrain, yTrain, {
    epochs: 100,
    validationSplit: 0.2,
    shuffle: true,
    verbose: 1,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4) || 'N/A'}, accuracy = ${logs?.acc.toFixed(4) || 'N/A'}`);
        }
      }
    }
  });
  
  // Test the model with a few examples
  console.log('\nTesting model with sample inputs:');
  await testModel(model, vocabMap, modelDir);
  
  // Save the model
  console.log(`\nSaving model to ${modelDir}...`);
  await model.save(`file://${modelDir}`);
  
  console.log('\nModel trained and saved successfully!');
  
  // Clean up
  xTrain.dispose();
  yTrain.dispose();
}

/**
 * Build vocabulary for feature extraction
 */
function buildVocabulary() {
  console.log('Building vocabulary...');
  
  // Create a mapping from keywords to feature indices
  return {
    // Payment-related terms (category 0)
    'payment': 0,
    'transaction': 0,
    'pay': 0,
    'credit': 0,
    'checkout': 0,
    'card': 0,
    
    // Order-related terms (category 1)
    'order': 1,
    'purchase': 1,
    'shipping': 1, 
    'delivery': 1,
    'track': 1,
    
    // User-related terms (category 2)
    'user': 2,
    'profile': 2,
    'account': 2,
    'login': 2,
    'register': 2,
    'auth': 2,
    
    // Product-related terms (category 3)
    'product': 3,
    'item': 3,
    'catalog': 3,
    'search': 3,
    'inventory': 3,
    'products': 3,
    
    // Default/general terms (category 4)
    'help': 4,
    'support': 4,
    'contact': 4,
    'about': 4,
    'status': 4,
    'health': 4
  };
}

/**
 * Save vocabulary to disk
 */
function saveVocabulary(vocabMap: Record<string, number>, modelDir: string) {
  const vocabPath = path.join(modelDir, 'vocab.json');
  try {
    fs.writeFileSync(vocabPath, JSON.stringify(vocabMap, null, 2));
    console.log(`Vocabulary saved to: ${vocabPath}`);
  } catch (error) {
    console.error('Error saving vocabulary:', error);
  }
}

/**
 * Generate training data based on the vocabulary
 */
function generateTrainingData(vocabMap: Record<string, number>) {
  // Sample training data
  // Format: [features], [label]
  // Features: 20-dimensional vector representing various request characteristics
  // Labels: 0 = payment-gateway, 1 = order-gateway, 2 = user-gateway, 3 = product-gateway, 4 = default-gateway
  
  return [
    // Payment gateway examples
    { features: createFeatureVector(['payment', 'transaction'], vocabMap), label: 0 },
    { features: createFeatureVector(['pay', 'credit'], vocabMap), label: 0 },
    { features: createFeatureVector(['checkout', 'card'], vocabMap), label: 0 },
    { features: createFeatureVector(['payment', 'process'], vocabMap), label: 0 },
    { features: createFeatureVector(['card', 'validate'], vocabMap), label: 0 },
    
    // Order gateway examples
    { features: createFeatureVector(['order', 'purchase'], vocabMap), label: 1 },
    { features: createFeatureVector(['shipping', 'delivery'], vocabMap), label: 1 },
    { features: createFeatureVector(['track', 'order'], vocabMap), label: 1 },
    { features: createFeatureVector(['order', 'status'], vocabMap), label: 1 },
    { features: createFeatureVector(['purchase', 'history'], vocabMap), label: 1 },
    
    // User gateway examples
    { features: createFeatureVector(['user', 'profile'], vocabMap), label: 2 },
    { features: createFeatureVector(['account', 'login'], vocabMap), label: 2 },
    { features: createFeatureVector(['register', 'auth'], vocabMap), label: 2 },
    { features: createFeatureVector(['user', 'settings'], vocabMap), label: 2 },
    { features: createFeatureVector(['account', 'update'], vocabMap), label: 2 },
    
    // Product gateway examples
    { features: createFeatureVector(['product', 'item'], vocabMap), label: 3 },
    { features: createFeatureVector(['catalog', 'search'], vocabMap), label: 3 },
    { features: createFeatureVector(['inventory', 'products'], vocabMap), label: 3 },
    { features: createFeatureVector(['product', 'details'], vocabMap), label: 3 },
    { features: createFeatureVector(['search', 'filter'], vocabMap), label: 3 },
    
    // Default gateway (fallback examples)
    { features: createFeatureVector(['help', 'support'], vocabMap), label: 4 },
    { features: createFeatureVector(['contact', 'about'], vocabMap), label: 4 },
    { features: createFeatureVector(['status', 'health'], vocabMap), label: 4 },
    { features: createFeatureVector(['api', 'docs'], vocabMap), label: 4 },
    { features: createFeatureVector(['unknown', 'misc'], vocabMap), label: 4 },
  ];
}

/**
 * Create a feature vector for a given set of keywords
 */
function createFeatureVector(keywords: string[], vocabMap: Record<string, number>): number[] {
  // Create a feature vector where certain positions are activated based on keywords
  const featureVector = new Array(20).fill(0);
  
  // Set feature values based on keywords
  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    const categoryIndex = vocabMap[lowerKeyword];
    
    if (categoryIndex !== undefined) {
      // Set primary category indicator
      featureVector[categoryIndex] = 1;
      
      // Set additional features based on the keyword
      featureVector[5 + categoryIndex] = 1; // Offset to separate from path features
    }
  });
  
  // Set some content type features (simulating headers)
  // In this example, we're setting JSON content type by default
  featureVector[15] = 1;
  
  return featureVector;
}

/**
 * Create and compile the TensorFlow model
 */
function createModel(): tf.Sequential {
  // Create model
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.dense({
    units: 12,
    activation: 'relu',
    inputShape: [20], // 20 dimensional input
  }));
  
  // Hidden layer
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu',
  }));
  
  // Output layer (5 gateways)
  model.add(tf.layers.dense({
    units: 5,
    activation: 'softmax',
  }));
  
  // Compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  return model;
}

/**
 * Test the model with sample inputs and log results
 */
async function testModel(model: tf.LayersModel, vocabMap: Record<string, number>, modelDir: string) {
  // Test cases to evaluate
  const testCases = [
    { input: ['order', 'status'], expected: 'order-gateway' },
    { input: ['payment', 'process'], expected: 'payment-gateway' },
    { input: ['user', 'profile'], expected: 'user-gateway' },
    { input: ['product', 'search'], expected: 'product-gateway' },
    { input: ['help', 'unknown'], expected: 'default-gateway' },
  ];
  
  // Gateway name mapping
  const gatewayMap = ['payment-gateway', 'order-gateway', 'user-gateway', 'product-gateway', 'default-gateway'];
  
  // Save test results for reporting
  const testResults: Array<{
    input: string;
    expected: string;
    predicted: string;
    correct: boolean;
    probabilities: string[];
  }> = [];
  
  // Test each case
  for (const testCase of testCases) {
    const features = createFeatureVector(testCase.input, vocabMap);
    const inputTensor = tf.tensor2d([features]);
    
    // Make prediction
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const predictionData = await prediction.data();
    
    // Get index of highest probability
    const maxIndex = Array.from(predictionData).indexOf(Math.max(...Array.from(predictionData)));
    const predictedGateway = gatewayMap[maxIndex];
    
    // Log result
    const result = {
      input: testCase.input.join(', '),
      expected: testCase.expected,
      predicted: predictedGateway,
      correct: predictedGateway === testCase.expected,
      probabilities: Array.from(predictionData).map(p => p.toFixed(4))
    };
    
    testResults.push(result);
    console.log(`Test: "${result.input}" → Predicted: ${result.predicted}, Expected: ${result.expected}`);
    
    // Clean up
    inputTensor.dispose();
    prediction.dispose();
  }
  
  // Save test results
  const resultsPath = path.join(modelDir, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`Test results saved to: ${resultsPath}`);
}

// Run the training
trainModel().catch(err => {
  console.error('Error training model:', err);
}); 