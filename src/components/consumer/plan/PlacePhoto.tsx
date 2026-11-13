import React, { useEffect, useState } from 'react';
import { getPlacePhoto, PlacePhoto as Photo } from '../../../services/placePhotos';

interface PlacePhotoProps {
  place: string;
  destination?: string;
  className?: string;
  /** Show the photo credit (source + link) on the image */
  showCredit?: boolean;
  /** Text shown on the image (e.g. the place name) */
  label?: string;
  /** 'hotel': the exact hotel if we can find it, else its area — labelled "Area: …, not the hotel" */
  kind?: 'place' | 'hotel';
  /** The hotel's area (used when kind = 'hotel') */
  area?: string;
  /** Shown while there's no photo (instead of nothing), e.g. an icon tile */
  fallback?: React.ReactNode;
}

const SOURCE_NAME: Record<string, string> = { google: 'Google', wikipedia: 'Wikipedia', commons: 'Wikimedia', unsplash: 'Unsplash', pexels: 'Pexels' };

/**
 * A real photo of a place or hotel, with credit. While loading: a soft placeholder.
 * If no photo fits, nothing (or `fallback`) is shown — never a wrong picture passed off as the real one.
 */
export const PlacePhoto: React.FC<PlacePhotoProps> = ({ place, destination, className = '', showCredit = false, label, kind = 'place', area, fallback }) => {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setPhoto(undefined);
    getPlacePhoto(place, destination, { kind, area }).then((p) => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [place, destination, kind, area]);

  if (photo === null) return fallback ? <>{fallback}</> : null;

  // A hotel photo that only shows the area says so, on the photo itself
  const areaOnly = photo && photo.exact === false;
  const shows = (photo?.shows || area || destination || '').replace(/,.*$/, '');
  const caption = photo?.source === 'pexels' || photo?.source === 'unsplash'
    ? `Stock photo · ${shows}${kind === 'hotel' ? ' area' : ''}`
    : areaOnly
    ? `Area: ${shows}${kind === 'hotel' ? ' (not the hotel)' : ''}`
    : label;

  return (
    <figure className={`relative overflow-hidden bg-[#EEF1EC] ${className}`}>
      {photo && (
        <img
          src={photo.url}
          alt={areaOnly ? `The area around ${place}` : `${place}${destination ? `, ${destination.replace(/,.*$/, '')}` : ''}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setPhoto(null)}
        />
      )}
      {caption && photo && (
        <figcaption className="absolute left-1.5 bottom-1.5 max-w-[85%] truncate rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {caption}
        </figcaption>
      )}
      {showCredit && photo && (
        <a
          href={photo.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-1 top-1 rounded bg-black/45 px-1.5 py-0.5 text-[9px] text-white/90 hover:text-white"
          title={`Photo: ${photo.pageTitle}`}
        >
          Photo: {SOURCE_NAME[photo.source || 'wikipedia']}
        </a>
      )}
    </figure>
  );
};
