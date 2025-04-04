import type { NextConfig } from "next";
import 'dotenv/config';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
};

export default nextConfig;
