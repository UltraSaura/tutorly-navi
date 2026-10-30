#!/usr/bin/env node
/**
 * Preflight for the existing Google Play Internal Testing listing.
 * Run after 'npx cap sync android' with the default capacitor.config.ts.
 * This intentionally does NOT sign or upload an AAB.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const fail = (message) => { console.error('Android Play preflight FAILED: ' + message); process.exitCode = 1; };

const configPath = 'android/app/src/main/assets/capacitor.config.json';
const indexPath = 'android/app/src/main/assets/public/index.html';
const gradlePath = 'android/app/build.gradle';
const variablesPath = 'android/variables.gradle';
if (!existsSync(resolve(root, configPath))) {
  fail('Generated Capacitor config missing. Run npm run build:beta, then npx cap sync android.');
} else {
  let config;
  try { config = JSON.parse(read(configPath)); }
  catch { fail('Generated Capacitor config is not valid JSON.'); }
  if (config) {
    if (config.appId !== 'com.tutorly.learning') fail('Incorrect Play application ID: ' + config.appId);
    if (config.webDir && config.webDir !== 'dist') fail('Unexpected webDir: ' + config.webDir);
    if (config.server?.url) fail('External server.url must be absent from a distributable Android build: ' + config.server.url);
    if (config.server?.cleartext) fail('Server cleartext mode must not be enabled for Play builds.');
  }
}
if (!existsSync(resolve(root, indexPath))) fail('Bundled index.html missing; Android will not have offline web assets.');
else if (!read(indexPath).trim()) fail('Bundled index.html is empty.');
const gradle = read(gradlePath);
const variables = read(variablesPath);
const minSdkMatch = variables.match(/\bminSdkVersion\s*=\s*(\d+)/);
if (!minSdkMatch || Number(minSdkMatch[1]) < 24) fail('Google Play automatic protection requires minSdkVersion >= 24.');
if (!/minSdkVersion\s+rootProject\.ext\.minSdkVersion/.test(gradle)) fail('App Gradle is not consuming the verified minSdkVersion.');
if (!/applicationId\s+["']com\.tutorly\.learning["']/.test(gradle)) fail('Base Google Play application ID mismatch in Gradle.');
if (/applicationIdSuffix\s+["']\.staging["']/.test(gradle)) fail('Unexpected applicationIdSuffix.');
if (!process.exitCode) console.log('Android Play preflight OK: embedded web assets, no server.url, Google Play package com.tutorly.learning. Signing and runtime checks still required.');
