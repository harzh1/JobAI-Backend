import dotenv from 'dotenv';
dotenv.config();

import('./testWhyFails.js').catch(console.error);
