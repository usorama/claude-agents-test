import { test } from 'node:test';
import assert from 'node:assert';
import { ContextManager } from '../src/context/ContextManager.js';
import fs from 'fs/promises';
import path from 'path';

test('ContextManager - Initialize creates directories', async () => {
  const cm = new ContextManager({ baseDir: './test-context' });
  await cm.initialize();
  
  const dirs = await fs.readdir('./test-context');
  assert(dirs.includes('agents'));
  assert(dirs.includes('shared'));
  
  // Cleanup
  await fs.rm('./test-context', { recursive: true, force: true });
});

test('ContextManager - Save and load context', async () => {
  const cm = new ContextManager({ baseDir: './test-context' });
  await cm.initialize();
  
  const testData = { test: 'data', timestamp: Date.now() };
  await cm.saveContext('test-agent', 'state', testData);
  
  const loaded = await cm.loadContext('test-agent', 'state');
  assert.deepStrictEqual(loaded, testData);
  
  // Cleanup
  await fs.rm('./test-context', { recursive: true, force: true });
});

test('ContextManager - Context size limit', async () => {
  const cm = new ContextManager({ 
    baseDir: './test-context',
    maxContextSize: 100 // Very small for testing
  });
  await cm.initialize();
  
  const largeData = { data: 'x'.repeat(200) };
  
  await assert.rejects(
    cm.saveContext('test-agent', 'state', largeData),
    /Context size .* exceeds limit/
  );
  
  // Cleanup
  await fs.rm('./test-context', { recursive: true, force: true });
});

test('ContextManager - Share context between agents', async () => {
  const cm = new ContextManager({ baseDir: './test-context' });
  await cm.initialize();
  
  const sharedData = { shared: 'data' };
  const shareId = await cm.shareContext('agent1', 'agent2', 'test', sharedData);
  
  assert(shareId);
  
  const retrieved = await cm.getSharedContext(shareId);
  assert.strictEqual(retrieved.from, 'agent1');
  assert.strictEqual(retrieved.to, 'agent2');
  assert.deepStrictEqual(retrieved.data, sharedData);
  
  // Cleanup
  await fs.rm('./test-context', { recursive: true, force: true });
});