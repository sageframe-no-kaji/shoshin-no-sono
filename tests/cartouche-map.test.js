import { describe, it, expect } from 'vitest';
import { cartoucheSvg } from '../src/cartouche-map.js';

describe('cartoucheSvg — session 8, variant A', () => {
  it('carries its own cream reserve at the artifact geometry (the reserve IS the frame)', () => {
    const svg = cartoucheSvg();
    expect(svg).toContain('<rect x="22" y="18" width="276" height="164" fill="#FDFCF9"/>');
    expect(svg).not.toContain('stroke-dasharray'); // no box rules but the terracotta one
  });

  it('over land, a coastline-style hairline defines the reserve edge — dialable to the unframed lock', () => {
    const framed = cartoucheSvg(); // default 0.45 hairline
    expect(framed).toContain('fill="none" stroke="#2B2B2B" stroke-width="0.45"');
    const unframed = cartoucheSvg({ border: 0 }); // the session-8 open-water lock
    expect(unframed).not.toContain('fill="none" stroke="#2B2B2B"');
    const heavy = cartoucheSvg({ border: 0.8 });
    expect(heavy).toContain('stroke-width="0.80"');
  });

  it('the masthead spans the whole column; English and tagline sit below the rule', () => {
    const svg = cartoucheSvg();
    expect(svg).toContain('初心の園');
    expect(svg).toContain('font-size="52"'); // the native leads, full-width
    expect(svg).toContain('SHOSHIN NO SONO');
    // Both masthead lines justify edge-to-edge across the 248px column.
    expect((svg.match(/textLength="248" lengthAdjust="spacing"/g) ?? []).length).toBe(2);
    expect(svg).toContain('The Garden of Beginner’s Mind');
    expect(svg).toContain('The garden has gates on every side.');
    expect((svg.match(/font-style="italic"/g) ?? []).length).toBe(2); // both tagline lines
  });

  it('the terracotta rule spans the full column with end ticks — the one flourish', () => {
    const svg = cartoucheSvg();
    const terra = svg.match(/stroke="#9A5B3C"/g) ?? [];
    expect(terra).toHaveLength(3); // rule + two ticks, nothing else in terracotta
    expect(svg).toContain('x1="36" y1="112" x2="284" y2="112"'); // full-column shelf
  });

  it('is deterministic — same opts, same block (the seeded fan is retired)', () => {
    expect(cartoucheSvg()).toBe(cartoucheSvg());
    expect(cartoucheSvg()).not.toContain('stroke-width="0.55"'); // no fan strokes remain
  });

  it('the Sageframe chop drops below the rule at right, sized by dial', () => {
    const withChop = cartoucheSvg();
    expect(withChop).toContain('href="./sf-chop.png"');
    // Default 60 px, centred at (254, 145) — below the rule (y=112), right of the English.
    expect(withChop).toContain('x="224.0" y="115.0" width="60" height="60"');
    const small = cartoucheSvg({ chopSize: 44 });
    expect(small).toContain('x="232.0" y="123.0" width="44" height="44"');
    const custom = cartoucheSvg({ chopHref: './assets/chop.png' });
    expect(custom).toContain('href="./assets/chop.png"');
    expect(cartoucheSvg({ chopHref: '' })).not.toContain('<image');
    expect(cartoucheSvg({ chopSize: 0 })).not.toContain('<image');
  });

  it('the masthead centres the column; the English block centres left below it', () => {
    const svg = cartoucheSvg();
    expect(svg).toContain('<text x="160"'); // masthead lines on the column centre
    expect(svg).toContain('<text x="125"'); // English block below the rule
  });
});
