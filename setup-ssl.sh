#!/bin/bash

# Generate self-signed SSL certificate for development/training environment
# In production, use a proper CA-signed certificate

echo "Generating self-signed SSL certificate..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=deskly-training.local"

echo "SSL certificate generated successfully."
echo "Note: This is a self-signed certificate for training purposes only."
echo "In production, use a proper CA-signed certificate."
