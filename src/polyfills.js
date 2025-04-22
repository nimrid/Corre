// Polyfill for Buffer
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;

// Polyfill for process.env
window.process = {
  env: {},
};

// Polyfill for global
window.global = window; 