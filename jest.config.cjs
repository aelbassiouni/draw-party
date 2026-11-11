module.exports = {
  preset: 'jest-expo/android',
  testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.local/'],
};
