export const getAdditionalPassengerNames = (reservation) => {
  const source =
    reservation?.dalsi_pasazeri ??
    reservation?.dalsi_pasazeri_jmena ??
    reservation?.jmena_dalsich_pasazeru ??
    reservation?.spolucestujici ??
    reservation?.doprovodni_pasazeri ??
    [];

  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return (item.jmeno || item.name || item.text || '').trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof source === 'string') {
    return source
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const getPeopleWord = (count) => {
  if (count === 1) return 'osoba';
  if (count >= 2 && count <= 4) return 'osoby';
  return 'osob';
};

export const getAdditionalPassengerCount = (reservation) =>
  Math.max(0, (Number(reservation?.pocet_mist) || 1) - 1);

export const getAdditionalPassengerBadge = (reservation) => {
  const count = getAdditionalPassengerCount(reservation);
  if (count <= 0) return '';
  return `+${count} ${getPeopleWord(count)}`;
};
