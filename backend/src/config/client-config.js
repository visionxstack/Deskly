const clientConfig = {
  // App configuration
  appName: 'Deskly',
  version: '1.0.0',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  
  // External service configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  internalApiToken: process.env.INTERNAL_API_TOKEN || '',
  
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET || '',
  
  sendGridApiKey: process.env.SENDGRID_API_KEY || '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  
  firebaseApiKey: process.env.FIREBASE_API_KEY || '',
  firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  
  // Feature flags
  features: {
    darkMode: true,
    exportToCsv: true,
    apiV2: true,
    betaFeatures: false,
  },
  
  // Rate limits
  rateLimits: {
    apiRequestsPerMinute: 100,
    loginAttemptsPerHour: 5,
    fileUploadsPerDay: 20,
  },
};

module.exports = clientConfig;
