import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatFileSize, cn } from '../src/lib/utils.ts';

describe('Web Utility Functions', () => {
  describe('formatDuration', () => {
    it('formats 0 as 0:00', () => {
      assert.equal(formatDuration(0), '0:00');
    });

    it('formats 65 seconds as 1:05', () => {
      assert.equal(formatDuration(65), '1:05');
    });

    it('formats 3661 seconds as 1:01:01', () => {
      assert.equal(formatDuration(3661), '1:01:01');
    });

    it('returns --:-- for null', () => {
      assert.equal(formatDuration(null), '--:--');
    });

    it('returns --:-- for NaN', () => {
      assert.equal(formatDuration(NaN), '--:--');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      assert.equal(formatFileSize(512), '512 B');
    });

    it('formats kilobytes', () => {
      assert.equal(formatFileSize(1536), '1.5 KB');
    });

    it('formats megabytes', () => {
      assert.equal(formatFileSize(10 * 1024 * 1024), '10.0 MB');
    });

    it('returns — for null', () => {
      assert.equal(formatFileSize(null), '—');
    });
  });

  describe('cn', () => {
    it('merges classes correctly', () => {
      assert.equal(cn('px-2', 'py-1'), 'px-2 py-1');
      assert.equal(cn('px-2', true && 'text-white', false && 'hidden'), 'px-2 text-white');
    });
  });
});
