// Compatibility entry point; share credential handling and validation.
process.argv[2] = 'rs';
require('./fetch-airspaces');
