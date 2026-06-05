const COUNTRIES = {
  cz: {
    code: 'cz',
    openAipCode: 'CZ',
    label: 'Czech Republic',
    bbox: '48.55,12.09,51.06,18.86',
    halves: [
      { bbox: '49.8,12.09,51.06,18.86', label: 'North' },
      { bbox: '48.55,12.09,49.8,18.86', label: 'South' },
    ],
    quadrants: [
      { bbox: '49.8,12.09,51.06,15.5', label: 'NW' },
      { bbox: '49.8,15.5,51.06,18.86', label: 'NE' },
      { bbox: '48.55,12.09,49.8,15.5', label: 'SW' },
      { bbox: '48.55,15.5,49.8,18.86', label: 'SE' },
    ],
  },

  rs: {
    code: 'rs',
    openAipCode: 'RS',
    label: 'Serbia',
    bbox: '42.23,18.81,46.19,23.01',
    halves: [
      { bbox: '44.2,18.81,46.19,23.01', label: 'North' },
      { bbox: '42.23,18.81,44.2,23.01', label: 'South' },
    ],
    quadrants: [
      { bbox: '44.2,18.81,46.19,20.91', label: 'NW' },
      { bbox: '44.2,20.91,46.19,23.01', label: 'NE' },
      { bbox: '42.23,18.81,44.2,20.91', label: 'SW' },
      { bbox: '42.23,20.91,44.2,23.01', label: 'SE' },
    ],
  },
};

function getCountry() {
  const code = (process.argv[2] || 'cz').toLowerCase();

  if (!COUNTRIES[code]) {
    throw new Error(`Unknown country: ${code}. Supported: ${Object.keys(COUNTRIES).join(', ')}`);
  }

  return COUNTRIES[code];
}

module.exports = { COUNTRIES, getCountry };