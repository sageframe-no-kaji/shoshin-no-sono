import { describe, it, expect } from 'vitest';
import { faceKeySvg, KEY_RESERVE } from '../src/key-map.js';

describe('faceKeySvg — session 9, variant A', () => {
  it('carries its own cream reserve, grown from the artifact for fallback-serif air and the ROAD line, exported for the page keep-out', () => {
    expect(KEY_RESERVE).toEqual({ x: 53, y: 52, w: 248, h: 137 });
    const svg = faceKeySvg();
    expect(svg).toContain('<rect x="53" y="52" width="248" height="137" fill="#FDFCF9"/>');
  });

  it('takes the cartouche’s hairline border by default — dialable to the unframed session lock', () => {
    const framed = faceKeySvg(); // default 0.45, the cartouche's landing
    expect(framed).toContain('fill="none" stroke="#2B2B2B" stroke-width="0.45"');
    // The road swatch's ink body is also fill="none" ink, so the unframed
    // check targets the border RECT itself.
    const unframed = faceKeySvg({ border: 0 }); // the session-9 open-water lock
    expect(unframed).not.toContain('height="137" fill="none"');
    const heavy = faceKeySvg({ border: 0.8 });
    expect(heavy).toContain('stroke-width="0.80"');
  });

  it('names the four face marks — both line vocabularies explained; the beacon stays on the verso', () => {
    const svg = faceKeySvg();
    expect(svg).toContain('PEAK');
    expect(svg).toContain('TOWN');
    expect(svg).toContain('TRAIL');
    expect(svg).toContain('ROAD');
    expect(svg).not.toContain('BEACON');
    // The artifact's glosses, verbatim, each led by an em-dash — road's from
    // the variant-B vocabulary (the ROAD amendment).
    expect(svg).toContain('— a work; height is weight.');
    expect(svg).toContain('— the writing, at its foot.');
    expect(svg).toContain('— to what a writing documents.');
    expect(svg).toContain('— joins companion writings.');
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
    // Road: the cased double-line — paper casing over ink over paper centre.
    expect(svg).toContain('stroke="#FDFCF9" stroke-width="6.4"');
    expect(svg).toContain('stroke="#2B2B2B" stroke-width="4.4"');
    expect(svg).toContain('stroke="#FDFCF9" stroke-width="2.2"');
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
