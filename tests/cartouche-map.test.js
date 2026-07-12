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

  it('the four-line hierarchy: native leads, roman tracks wide, tagline whispers italic', () => {
    const svg = cartoucheSvg();
    expect(svg).toContain('初心の園');
    expect(svg).toContain('font-size="44"'); // the native's steep jump
    expect(svg).toContain('SHOSHIN NO SONO');
    expect(svg).toContain('letter-spacing:0.34em'); // the roman's wide tracking
    expect(svg).toContain('The Garden of Beginner’s Mind');
    expect(svg).toContain('The garden has gates on every side.');
    expect((svg.match(/font-style="italic"/g) ?? []).length).toBe(2); // both tagline lines
  });

  it('the terracotta rule with end ticks is the one flourish', () => {
    const svg = cartoucheSvg();
    const terra = svg.match(/stroke="#9A5B3C"/g) ?? [];
    expect(terra).toHaveLength(3); // rule + two ticks, nothing else in terracotta
  });

  it('is deterministic — same opts, same block (the seeded fan is retired)', () => {
    expect(cartoucheSvg()).toBe(cartoucheSvg());
    expect(cartoucheSvg()).not.toContain('stroke-width="0.55"'); // no fan strokes remain
  });

  it('the Sageframe chop signs large at right — letterhead composition, sized by dial', () => {
    const withChop = cartoucheSvg();
    expect(withChop).toContain('href="./sf-chop.png"');
    // Default 60 px, centred at (256, 100) beside the left-shifted text.
    expect(withChop).toContain('x="226.0" y="70.0" width="60" height="60"');
    const small = cartoucheSvg({ chopSize: 44 });
    expect(small).toContain('x="234.0" y="78.0" width="44" height="44"');
    const custom = cartoucheSvg({ chopHref: './assets/chop.png' });
    expect(custom).toContain('href="./assets/chop.png"');
    expect(cartoucheSvg({ chopHref: '' })).not.toContain('<image');
    expect(cartoucheSvg({ chopSize: 0 })).not.toContain('<image');
  });

  it('the text block centres left of the artifact original, clearing the seal', () => {
    const svg = cartoucheSvg();
    expect(svg).toContain('<text x="125"'); // TEXT_CX
    expect(svg).not.toContain('<text x="160"');
  });
});
