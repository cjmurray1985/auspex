import { useMemo, useState } from 'react';
import { SETS } from '../data/sets';
import { artForSet, artThumbUrl, useBgPrefs } from '../data/backgrounds';

/**
 * Background-art curation tool — open with #bg-gallery in the URL.
 *
 * Pick a set, then check/uncheck its scraped mtgpics pieces (>=1024px). Every
 * kept piece rotates as a full-bleed background for THAT set only; the choice
 * is persisted per set (localStorage) and shared with the Background component,
 * so the effect is immediate. Not linked from the app UI.
 */
export function BgGallery() {
  const excluded = useBgPrefs((s) => s.excluded);
  const toggle = useBgPrefs((s) => s.toggle);
  const [setCode, setSetCode] = useState(SETS[0].code);
  const [onlyKept, setOnlyKept] = useState(false);

  const set = SETS.find((s) => s.code === setCode) ?? SETS[0];
  const ex = useMemo(() => new Set(excluded[setCode] ?? []), [excluded, setCode]);
  const items = useMemo(
    () => [...artForSet(setCode)].sort((a, b) => a.name.localeCompare(b.name)),
    [setCode],
  );
  const keptCount = items.filter((a) => !ex.has(a.num)).length;

  return (
    <div className="bggal">
      <header className="bggal-head">
        <div className="bggal-head-main">
          <label className="bggal-set">
            Set:{' '}
            <select value={setCode} onChange={(e) => setSetCode(e.target.value)}>
              {SETS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </label>
          {items.length > 0 ? (
            <span>
              <strong>{keptCount}</strong> of {items.length} in rotation for {set.name}. Uncheck any
              you don&rsquo;t want.
            </span>
          ) : (
            <span>
              No mtgpics art scraped for {set.name} yet — it shows a clean gradient until curated.
            </span>
          )}
        </div>
        <label className="bggal-toggle">
          <input type="checkbox" checked={onlyKept} onChange={(e) => setOnlyKept(e.target.checked)} />
          Show only kept
        </label>
      </header>
      <div className="bggal-grid">
        {items.map((a) => {
          const kept = !ex.has(a.num);
          if (onlyKept && !kept) return null;
          return (
            <label key={a.num} className={`bggal-tile${kept ? '' : ' out'}`}>
              <input type="checkbox" checked={kept} onChange={() => toggle(setCode, a.num)} />
              <img src={artThumbUrl(set.mtgpicsCode, a.num)} alt={a.name} loading="lazy" />
              <figcaption>
                <span className="bggal-name">{a.name}</span>
                <span className="bggal-meta">
                  {a.artist} &middot; {a.w}&times;{a.h}
                </span>
              </figcaption>
            </label>
          );
        })}
      </div>
    </div>
  );
}
