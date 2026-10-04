import { describe, expect, it } from 'vitest';
import { loadAllFigures, TEMPLATE_FIGURES, TEMPLATES } from './constellations';

describe('constellation figures', () => {
  it('the eager template file holds exactly the TEMPLATES figures', () => {
    expect(Object.keys(TEMPLATE_FIGURES).sort()).toEqual(TEMPLATES.map((t) => t.id).sort());
  });

  it('template figures are identical to the full 88-figure set', async () => {
    const all = await loadAllFigures();
    expect(Object.keys(all).length).toBe(88);
    for (const t of TEMPLATES) expect(TEMPLATE_FIGURES[t.id]).toEqual(all[t.id]);
  });
});
