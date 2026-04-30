import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './htmlSanitize';

describe('sanitizeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips <script> tags', () => {
    const out = sanitizeHtml('<p>safe</p><script>evil()</script><p>also safe</p>');
    expect(out).toContain('safe');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain('evil()');
  });

  it('strips <iframe> and <embed>', () => {
    const out = sanitizeHtml('<p>x</p><iframe src="evil"></iframe><embed src="evil"/>');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toMatch(/<embed/i);
  });

  it('strips <style> blocks', () => {
    const out = sanitizeHtml('<style>body{color:red}</style><p>hi</p>');
    expect(out).not.toMatch(/<style/i);
    expect(out).toContain('hi');
  });

  it('removes inline style attribute', () => {
    const out = sanitizeHtml('<p style="color:red">hi</p>');
    expect(out).toContain('hi');
    expect(out).not.toMatch(/style=/i);
  });

  it('removes event handler attributes', () => {
    const out = sanitizeHtml('<p onclick="evil()">hi</p>');
    expect(out).toContain('hi');
    expect(out).not.toMatch(/onclick/i);
  });

  it('removes javascript: URLs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('keeps allowed tags and attributes', () => {
    const out = sanitizeHtml('<p>hello <strong>world</strong></p><img src="x.jpg" alt="x"/>');
    expect(out).toContain('<p>');
    expect(out).toContain('<strong>');
    expect(out).toContain('<img');
    expect(out).toContain('src="x.jpg"');
    expect(out).toContain('alt="x"');
  });

  it('unwraps unknown tags but keeps text', () => {
    const out = sanitizeHtml('<custom-element>kept text</custom-element>');
    expect(out).not.toMatch(/<custom-element/);
    expect(out).toContain('kept text');
  });
});
