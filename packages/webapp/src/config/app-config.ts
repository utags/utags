import { isRunningInDedicatedDomain } from '../utils/url-utils.js'

// Only call isRunningInDedicatedDomain once at startup
const isRunningInDedicatedDomainValue = isRunningInDedicatedDomain()

const defaults = isRunningInDedicatedDomainValue
  ? {}
  : {
      preferQueryString: true,
      base: globalThis.location ? globalThis.location.pathname : '/',
      assetsBase: 'https://utags.link/',
    }

export const appConfig = Object.freeze({
  title: 'uTags', // Website title
  // Other configs
  maxBookmarksPerPage: 100,
  // githubApiUrl: 'http://localhost:3002',
  githubApiUrl: 'https://api.github.com',
  customApiUrl: '',
  // Don't change after this unless you know what you are doing
  preferQueryString: false,
  base: '/',
  assetsBase: '/',
  ...defaults,
} as const)

console.log('app config:', appConfig)

export default appConfig
