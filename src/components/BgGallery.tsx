import { useMemo, useState } from 'react';
import { MSH_ART, artThumbUrl, useBgPrefs } from '../data/backgrounds';

/**
 * Background-art curation tool — open with #bg-gallery in the URL.
 *
 * Lists every scraped mtgpics piece (set 493, >=1024px). Each is checked by
 * default; unchecking removes it from the live background rotation. The choice
 * is persisted (localStorage) and shared with the Background component, so the
 * effect is immediate. Not linked from the app UI.
 */
export function BgGallery() {
  const excluded = useBgPrefs((s) => s.excluded);
  const toggle = useBgPrefs((s) => s.toggle);
  const [onlyKept, setOnlyKept] = useState(false);

  const items = useMemo(() => [...MSH_ART].sort((a, b) => a.name.localeCompare(b.name)), []);
  const keptCount = items.filter((a) => !excluded.has(a.num)).length;

  return (
    <div className="bggal">
      <header className="bggal-head">
        <div>
          <strong>Background art</strong> — {keptCount} of {items.length} in rotation. Uncheck any
          you don&rsquo;t want to use.
        </div>
        <label className="bggal-toggle">
          <input type="checkbox" checked={onlyKept} onChange={(e) => setOnlyKept(e.target.checked)} />
          Show only kept
        </label>
      </header>
      <div className="bggal-grid">
        {items.map((a) => {
          const kept = !excluded.has(a.num);
          if (onlyKept && !kept) return null;
          return (
            <label key={a.num} className={`bggal-tile${kept ? '' : ' out'}`}>
              <input type="checkbox" checked={kept} onChange={() => toggle(a.num)} />
              <img src={artThumbUrl(a.num)} alt={a.name} loading="lazy" />
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
