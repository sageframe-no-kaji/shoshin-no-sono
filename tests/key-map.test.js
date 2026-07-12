import { describe, it, expect } from 'vitest';
import { faceKeySvg, KEY_RESERVE } from '../src/key-map.js';

describe('faceKeySvg — session 9, variant A', () => {
  it('carries its own cream reserve, grown from the artifact for fallback-serif air, exported for the page keep-out', () => {
    expect(KEY_RESERVE).toEqual({ x: 53, y: 52, w: 248, h: 112 });
    const svg = faceKeySvg();
    expect(svg).toContain('<rect x="53" y="52" width="248" height="112" fill="#FDFCF9"/>');
  });

  it('takes the cartouche’s hairline border by default — dialable to the unframed session lock', () => {
    const framed = faceKeySvg(); // default 0.45, the cartouche's landing
    expect(framed).toContain('fill="none" stroke="#2B2B2B" stroke-width="0.45"');
    const unframed = faceKeySvg({ border: 0 }); // the session-9 open-water lock
    expect(unframed).not.toContain('fill="none" stroke="#2B2B2B"');
    const heavy = faceKeySvg({ border: 0.8 });
    expect(heavy).toContain('stroke-width="0.80"');
  });

  it('names exactly the three face primitives — road and beacon stay on the verso', () => {
    const svg = faceKeySvg();
    expect(svg).toContain('PEAK');
    expect(svg).toContain('TOWN');
    expect(svg).toContain('TRAIL');
    expect(svg).not.toContain('ROAD');
    expect(svg).not.toContain('BEACON');
    // The artifact's TIGHT glosses, verbatim, each led by an em-dash.
    expect(svg).toContain('— a work; height is weight.');
    expect(svg).toContain('— the writing, at its foot.');
    expect(svg).toContain('— to what a writing documents.');
  });

  it('each entry carries a mark-sample at map weight, not an icon', () => {
    const svg = faceKeySvg({ seed: 12345 });
    // Peak: the seeded hachure fan at the map's relief-comb weight.
    expect(svg).toContain('stroke="#4A4A4A" stroke-width="0.55"');
    // Town: small ink blocks in register ink, each rotated off-grid.
    expect((svg.match(/fill="#2B2B2B"\/>/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(svg).toContain('transform="rotate(');
    // Trail: the fine rail with four perpendicular rungs at trail weight.
    expect((svg.match(/stroke="#6B6B6B" stroke-width="0.6"/g) ?? []).length).toBe(5);
  });

  it('the mark-samples are seed-deterministic within a layout and vary between layouts', () => {
    expect(faceKeySvg({ seed: 7 })).toBe(faceKeySvg({ seed: 7 }));
    expect(faceKeySvg({ seed: 7 })).not.toBe(faceKeySvg({ seed: 8 }));
    expect(faceKeySvg()).toBe(faceKeySvg({ seed: 0 })); // the default seed
  });

  it('is a self-contained group with no ornament — no terracotta, no heading, no rule', () => {
    const svg = faceKeySvg();
    expect(svg.startsWith('<g>')).toBe(true);
    expect(svg.endsWith('</g>')).toBe(true);
    expect(svg).not.toContain('#9A5B3C'); // terracotta is cartouche language
    expect(svg).not.toContain('KEY'); // no heading, no hairline rule — variant B/C language
    expect(svg).not.toContain('stroke-width="0.5"'); // the B/C hairline weight, absent here
  });
});
