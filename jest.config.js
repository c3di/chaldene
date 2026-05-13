/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  },
  moduleNameMapper: {
    // ReactFlow subpath imports (e.g. '@xyflow/react/dist/style.css')
    '^@xyflow/react/(.*)$': '<rootDir>/tests/__mocks__/styleMock.js',
    // ReactFlow main package
    '^@xyflow/react$': '<rootDir>/tests/__mocks__/xyflowReactMock.ts',
    // ESM-only visualization packages (d3-*, fabric) — not exercised in unit tests
    '^d3-scale-chromatic$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^d3-scale$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^d3-color$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^fabric$': '<rootDir>/tests/__mocks__/fabricMock.js',
    // All CSS / style imports
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  collectCoverageFrom: [
    'src/ChaldeneService.ts',
    'src/tokens.ts',
    'src/serviceRegistry.ts',
    'src/ReactVP/EditorContext.ts'
  ]
};
