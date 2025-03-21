import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiRoutingService implements OnModuleInit {
  private model: tf.LayersModel;
  private readonly modelPath: string;
  private isModelLoaded = false;
  private vocabMap: Map<string, number>;
  private readonly logger = new Logger(AiRoutingService.name);

  constructor(private readonly configService: ConfigService) {
    // Get model path from config, with fallback to a local directory
    this.modelPath = this.configService.get<string>('AI_MODEL_PATH') || path.join(process.cwd(), 'model');
    this.vocabMap = new Map();
    
    // Create model directory if it doesn't exist
    if (!fs.existsSync(this.modelPath)) {
      this.logger.log(`Creating model directory: ${this.modelPath}`);
      fs.mkdirSync(this.modelPath, { recursive: true });
    }
  }

  async onModuleInit() {
    try {
      // Load model on startup
      await this.loadModel();
      await this.loadVocabulary();
      this.isModelLoaded = true;
      this.logger.log('✅ TensorFlow model loaded successfully');
    } catch (error) {
      this.logger.error('❌ Failed to load TensorFlow model:', error);
    }
  }

  private async loadModel() {
    const modelJsonPath = path.join(this.modelPath, 'model.json');
    
    if (fs.existsSync(modelJsonPath)) {
      this.logger.log(`Loading model from: ${modelJsonPath}`);
      try {
        this.model = await tf.loadLayersModel(`file://${modelJsonPath}`);
        this.logger.log('Model loaded successfully');
      } catch (error) {
        this.logger.error('Error loading model from file:', error);
        this.initializeBasicModel();
      }
    } else {
      this.logger.warn(`No model found at ${modelJsonPath}, initializing a basic model`);
      this.initializeBasicModel();
    }
  }

  private async loadVocabulary() {
    const vocabPath = path.join(this.modelPath, 'vocab.json');
    
    try {
      if (fs.existsSync(vocabPath)) {
        // Load vocabulary from file
        const vocabData = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
        this.vocabMap = new Map(Object.entries(vocabData));
        this.logger.log(`Loaded vocabulary with ${this.vocabMap.size} entries`);
      } else {
        // Use default vocabulary
        this.logger.warn('No vocabulary file found, using default vocabulary');
        this.vocabMap.set('payment', 0);
        this.vocabMap.set('order', 1);
        this.vocabMap.set('user', 2);
        this.vocabMap.set('product', 3);
        
        // Save default vocabulary for future use
        this.saveVocabulary();
      }
    } catch (error) {
      this.logger.error('Error loading vocabulary:', error);
      // Fall back to default vocabulary
      this.vocabMap.set('payment', 0);
      this.vocabMap.set('order', 1);
      this.vocabMap.set('user', 2);
      this.vocabMap.set('product', 3);
    }
  }

  private async saveVocabulary() {
    const vocabPath = path.join(this.modelPath, 'vocab.json');
    try {
      // Convert Map to Object for JSON serialization
      const vocabObject = Object.fromEntries(this.vocabMap);
      fs.writeFileSync(vocabPath, JSON.stringify(vocabObject, null, 2));
      this.logger.log(`Vocabulary saved to: ${vocabPath}`);
    } catch (error) {
      this.logger.error('Error saving vocabulary:', error);
    }
  }

  private initializeBasicModel() {
    this.logger.log('Initializing a basic model');
    
    // Create a simple model as fallback
    const model = tf.sequential();
    model.add(tf.layers.dense({ 
      units: 10, 
      activation: 'relu', 
      inputShape: [20] 
    }));
    model.add(tf.layers.dense({ 
      units: 5, 
      activation: 'softmax' 
    }));
    
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    
    this.model = model;
    
    // Save the basic model for future use
    this.saveModel();
    
    this.logger.log('Basic model initialized and saved as fallback');
  }

  async saveModel() {
    try {
      // Save model to the file system
      const modelPath = `file://${this.modelPath}`;
      await this.model.save(modelPath);
      this.logger.log(`Model saved to: ${this.modelPath}`);
      return true;
    } catch (error) {
      this.logger.error('Error saving model:', error);
      return false;
    }
  }

  /**
   * Determines the best gateway to route a request to based on TensorFlow prediction
   */
  async determineRoute(path: string, body: any, headers: Record<string, string>): Promise<string> {
    if (!this.isModelLoaded) {
      this.logger.warn('Model not loaded, using default gateway');
      return 'default-gateway';
    }

    try {
      // Extract features from request
      const features = this.extractFeatures(path, body, headers);
      
      // Make prediction
      const inputTensor = tf.tensor2d([features]);
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();
      
      // Get index of highest probability
      const maxIndex = Array.from(predictionData).indexOf(Math.max(...Array.from(predictionData)));
      
      // Map to gateway names (in a real app, this would be from your config)
      const gatewayMap = ['payment-gateway', 'order-gateway', 'user-gateway', 'product-gateway', 'default-gateway'];
      const selectedGateway = gatewayMap[maxIndex] || 'default-gateway';
      
      // Log prediction details
      this.logger.debug(`Prediction for ${path}: ${Array.from(predictionData).map(p => p.toFixed(2)).join(', ')}`);
      this.logger.log(`Routed to: ${selectedGateway}`);
      
      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();
      
      return selectedGateway;
    } catch (error) {
      this.logger.error('Error making prediction:', error);
      return 'default-gateway';
    }
  }

  /**
   * Extract numeric features from the request that can be used by the TensorFlow model
   */
  private extractFeatures(path: string, body: any, headers: Record<string, string>): number[] {
    // This is a simplified feature extraction - in real applications, this would be more sophisticated
    const features = new Array(20).fill(0);
    
    // Process path - look for keywords in path
    const pathParts = path.toLowerCase().split('/').filter(Boolean);
    pathParts.forEach(part => {
      const index = this.vocabMap.get(part);
      if (index !== undefined && index < features.length) {
        features[index] = 1;
      }
    });
    
    // Process body - look for certain fields or values
    if (body) {
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        ['payment', 'order', 'user', 'product'].forEach(keyword => {
          if (bodyStr.includes(keyword)) {
            const index = this.vocabMap.get(keyword);
            if (index !== undefined && index < features.length) {
              features[index + 5] = 1; // Offset to separate from path features
            }
          }
        });
      } catch (e) {
        this.logger.error('Error processing body:', e);
      }
    }
    
    // Process content-type from headers
    const contentType = headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      features[15] = 1;
    } else if (contentType.includes('application/xml')) {
      features[16] = 1;
    } else if (contentType.includes('multipart/form-data')) {
      features[17] = 1;
    }
    
    return features;
  }
} 