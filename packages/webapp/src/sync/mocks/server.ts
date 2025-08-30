// src/sync/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers.js'

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers)
