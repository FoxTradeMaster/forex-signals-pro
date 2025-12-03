import { describe, it, expect, beforeAll } from 'vitest';
import { upsertSignalPerformance, getSignalPerformance } from './db';

describe('P/L Tracking System', () => {
  const testSignalId = 'test-signal-' + Date.now();

  beforeAll(async () => {
    // Create a test signal performance record
    await upsertSignalPerformance({
      signalId: testSignalId,
      currentPrice: '1.0850',
      plDollars: '50.00',
      plPips: '50',
      plPercentage: '0.46',
    });
  });

  it('should create signal performance record', async () => {
    const performance = await getSignalPerformance(testSignalId);
    
    expect(performance).toBeDefined();
    expect(performance?.signalId).toBe(testSignalId);
    expect(performance?.currentPrice).toBe('1.0850');
    expect(performance?.plDollars).toBe('50.00');
    expect(performance?.plPips).toBe('50');
    expect(performance?.plPercentage).toBe('0.46');
  });

  it('should update existing signal performance record', async () => {
    // Update the performance with new values
    await upsertSignalPerformance({
      signalId: testSignalId,
      currentPrice: '1.0900',
      plDollars: '100.00',
      plPips: '100',
      plPercentage: '0.92',
    });

    const performance = await getSignalPerformance(testSignalId);
    
    expect(performance).toBeDefined();
    expect(performance?.currentPrice).toBe('1.0900');
    expect(performance?.plDollars).toBe('100.00');
    expect(performance?.plPips).toBe('100');
    expect(performance?.plPercentage).toBe('0.92');
  });

  it('should handle negative P/L values (losses)', async () => {
    const lossSignalId = 'test-loss-signal-' + Date.now();
    
    await upsertSignalPerformance({
      signalId: lossSignalId,
      currentPrice: '1.0750',
      plDollars: '-50.00',
      plPips: '-50',
      plPercentage: '-0.46',
    });

    const performance = await getSignalPerformance(lossSignalId);
    
    expect(performance).toBeDefined();
    expect(performance?.plDollars).toBe('-50.00');
    expect(performance?.plPips).toBe('-50');
    expect(parseFloat(performance?.plDollars || '0')).toBeLessThan(0);
  });

  it('should return null for non-existent signal', async () => {
    const performance = await getSignalPerformance('non-existent-signal-id');
    expect(performance).toBeNull();
  });

  it('should handle zero P/L (entry price)', async () => {
    const zeroPlSignalId = 'test-zero-pl-signal-' + Date.now();
    
    await upsertSignalPerformance({
      signalId: zeroPlSignalId,
      currentPrice: '1.0800',
      plDollars: '0',
      plPips: '0',
      plPercentage: '0',
    });

    const performance = await getSignalPerformance(zeroPlSignalId);
    
    expect(performance).toBeDefined();
    expect(performance?.plDollars).toBe('0');
    expect(performance?.plPips).toBe('0');
    expect(parseFloat(performance?.plDollars || '0')).toBe(0);
  });
});
