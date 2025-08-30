import { splitTags } from 'utags-utils'
import { normalizeAndDeduplicateStrings } from '../index.js'
import { getHostName } from '../url-utils.js'
import { type FilterCondition, rejectAllCondition } from '../filter-registry.js'

function createExactDomainMatcher(domain: string): FilterCondition {
  return (href) => domain === getHostName(href)
}

function createDomainListMatcher(domains: string[]): FilterCondition {
  return (href) => domains.includes(getHostName(href))
}

function findCommonDomains(domainGroups: string[][]): string[] {
  if (domainGroups.length === 0) return []
  if (domainGroups.length === 1) return domainGroups[0]

  let commonDomains = domainGroups[0]
  for (let i = 1; i < domainGroups.length; i++) {
    commonDomains = commonDomains.filter((domain) =>
      domainGroups[i].includes(domain)
    )
    if (commonDomains.length === 0) break
  }

  return commonDomains
}

export function createDomainFilterCondition(
  params: URLSearchParams
): FilterCondition | undefined {
  if (!params.has('d')) return undefined

  const domainValues = params.getAll('d')
  const hasComma = domainValues.some((d) => d.includes(','))

  if (hasComma) {
    const domainGroups = domainValues
      .map((domainValue) => splitTags(domainValue))
      .filter((group) => group.length > 0)

    console.log('domainGroups', domainGroups)
    if (domainGroups.length === 0) return undefined

    const commonDomains = findCommonDomains(domainGroups)

    console.log('commonDomains', commonDomains)
    return commonDomains.length === 0
      ? rejectAllCondition
      : commonDomains.length === 1
        ? createExactDomainMatcher(commonDomains[0])
        : createDomainListMatcher(commonDomains)
  }

  const uniqueDomains = normalizeAndDeduplicateStrings(domainValues)
  console.log('uniqueDomains', uniqueDomains)
  // 只能有一个域名，多个域名则无匹配结果
  return uniqueDomains.length === 1
    ? createExactDomainMatcher(uniqueDomains[0])
    : uniqueDomains.length > 1
      ? rejectAllCondition
      : undefined
}
