import { describe, expect, it } from 'vitest';
import {
  LEGALITY_BAR,
  STRIP,
  VIEW,
  legalityBounds,
  plotBottom,
  polyline,
  range,
  scaleY,
  stepLabel,
  ticks,
} from '../src/islands/TrainingReplay';

describe('TrainingReplay axes', () => {
  it('puts round ticks strictly inside the bounds, at most five', () => {
    /* The loss range of the real `small` run, padded the way `range` pads it. */
    const loss = range([2.6531, 1.4594, 2.6279, 1.5197]);
    expect(ticks(loss)).toEqual([1.5, 2, 2.5]);
    const top1 = range([0.3341, 0.512]);
    expect(ticks(top1)).toEqual([0.35, 0.4, 0.45, 0.5]);
    for (const [bounds, values] of [
      [loss, ticks(loss)],
      [top1, ticks(top1)],
    ] as const) {
      expect(values.length).toBeLessThanOrEqual(5);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(bounds[0]);
        expect(v).toBeLessThanOrEqual(bounds[1]);
      }
    }
  });

  it('marks the steps every five thousand on a 1 000-20 000 run', () => {
    expect(ticks([1000, 20000])).toEqual([5000, 10000, 15000, 20000]);
    expect(ticks([0, 0])).toEqual([]);
  });

  it('writes step labels with a narrow no-break space as the lessons do', () => {
    expect(stepLabel(1000)).toBe('1 000');
    expect(stepLabel(20000)).toBe('20 000');
    expect(stepLabel(250)).toBe('250');
  });
});

describe('TrainingReplay legality strip', () => {
  it('pins the top to 100 % and floors the bottom to a multiple of 5 %', () => {
    expect(legalityBounds([0.88, 0.94, 0.9925])).toEqual([0.85, 1]);
    expect(legalityBounds([0.999, 1])).toEqual([0.95, 1]);
    expect(legalityBounds([Number.NaN])).toEqual([0, 1]);
  });

  it('keeps the 99 % bar inside the strip of the real run', () => {
    const [low, high] = legalityBounds([0.88, 0.9925]);
    expect(LEGALITY_BAR).toBeGreaterThan(low);
    expect(LEGALITY_BAR).toBeLessThan(high);
  });

  it('takes the strip and its gap from the plot, never from the labels', () => {
    expect(plotBottom(false)).toBe(VIEW.h - VIEW.bottom);
    expect(plotBottom(true)).toBe(VIEW.h - VIEW.bottom - STRIP.h - STRIP.gap);
    expect(plotBottom(true)).toBeGreaterThan(VIEW.top + 100);
    /* The lines follow the plot bottom, so a shorter plot still ends on its axis. */
    expect(scaleY(0, [0, 1], plotBottom(true))).toBe(plotBottom(true));
    expect(polyline([0, 1], [0, 1], plotBottom(true))).toBe(
      `${VIEW.left},${plotBottom(true)} ${VIEW.w - VIEW.right},${VIEW.top}`,
    );
  });
});
