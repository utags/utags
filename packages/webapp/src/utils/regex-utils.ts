import Console from 'console-tagger'

const console = new Console({
  prefix: 'regex-utils',
  color: { line: 'white', background: 'purple' },
})

/**
 * Type definition for a regex extraction result
 */
export type RegexExtraction = {
  pattern: string
  flags: string
}

/**
 * Extracts all valid regular expressions from a given string
 * The regex must be preceded by a space, start of line, colon, or comma, and followed by a space or end of line
 * @param {string} str - String containing regular expressions
 * @returns {Array<RegexExtraction>} Array of extracted regex objects
 * @example
 * // Returns [{ pattern: "abc", flags: "i" }, { pattern: "xyz", flags: "g" }]
 * extractValidRegexes("abc /abc/i defg /xyz/g")
 * // Returns [{ pattern: "xyz", flags: "g" }]
 * extractValidRegexes("test:/xyz/g more")
 * // Returns [] - no match because no space after regex
 * extractValidRegexes("test /abc/idef")
 */
export function extractValidRegexes(str: string): RegexExtraction[] {
  const result: RegexExtraction[] = []

  // Match regex patterns in the form of /pattern/flags
  // The pattern can contain any character except unescaped /
  // Flags can include i, g, m, s, u, y, d
  // The regex must be preceded by:
  // - Start of line (^)
  // - Whitespace (\s)
  // - Colon (:) : this is to allow for regex after the range prefix, e.g. "title:/xyz/g"
  // - Comma (,) : this is to allow for regex after an or condition, e.g. "abc,/xyz/g"
  // - Exclamation mark (!) : this is to allow for regex to be a not condition, e.g. "!/xyz/g"
  // - Hyphen (-) : this is to allow for regex to be a not condition, e.g. "-/xyz/g"
  // And followed by whitespace or end of line
  const regexPattern =
    /(?:^|[\s:,!-])\/([^/\\]*(?:\\.[^/\\]*)*)\/([gimsuyd]*)(?:\s|$)/g

  let match

  while ((match = regexPattern.exec(str)) !== null) {
    const [_, pattern, flags] = match

    try {
      // Validate the extracted regex
      const _ = new RegExp(pattern, flags)

      // If no exception is thrown, add to results
      result.push({ pattern, flags })
    } catch (error) {
      console.warn(`Invalid regex /${pattern}/${flags}:`, error)
      // When encountering an invalid regex, continue matching from after the first /
      // Set lastIndex to the current match start position + 1
      regexPattern.lastIndex = match.index + 1
    }
  }

  return result
}

/**
 * Extracts the pattern of the first valid regex from a string
 * The regex must be preceded by a space, start of line, colon, or comma, and followed by a space or end of line
 * @param {string} str - String containing regular expressions
 * @returns {string} The extracted regex pattern or empty string if none found
 * @example
 * // Returns "abc"
 * extractValidRegex("text /abc/i more")
 * // Returns "xyz"
 * extractValidRegex("test:/xyz/g text")
 * // Returns "" - no match because no space after regex
 * extractValidRegex("test /abc/idef")
 */
export function extractValidRegex(str: string): string {
  const regexes = extractValidRegexes(str)
  return regexes.length > 0 ? regexes[0].pattern : ''
}

/**
 * Creates a RegExp object from a string containing regex notation
 * The regex must be preceded by a space, start of line, colon, or comma, and followed by a space or end of line
 * @param {string} str - String containing regular expressions
 * @returns {RegExp|null} The created RegExp object or null if invalid
 * @example
 * // Returns /abc/i
 * createRegexFromString("text /abc/i more")
 * // Returns /xyz/g
 * createRegexFromString("test:/xyz/g text")
 * // Returns null - no match because no space after regex
 * createRegexFromString("test /abc/idef")
 */
// This eslint rule for keeping using null not undefined
// eslint-disable-next-line @typescript-eslint/ban-types
export function createRegexFromString(str: string): RegExp | null {
  const regexes = extractValidRegexes(str)
  if (regexes.length === 0) return null

  try {
    const { pattern, flags } = regexes[0]
    console.log(
      'createRegexFromString',
      { pattern, flags },
      new RegExp(pattern, flags)
    )
    return new RegExp(pattern, flags)
  } catch (error) {
    console.error('Failed to create RegExp:', error)
    return null
  }
}

/**
 * Encodes a regex string in the format '/pattern/flags' to 're/encoded-pattern/flags'
 * The encoding process:
 * 1. URL encodes the pattern using encodeURIComponent
 * 2. Converts uppercase letters to lowercase with '^' prefix
 * 3. Removes spaces and commas
 * @param {string} regexStr - Regex string in the format '/pattern/flags'
 * @returns {string} Encoded string or empty string if invalid
 * @example
 * // Returns "re/abc/i"
 * encodeRegex("/abc/i")
 * // Returns "re/^hello%20world/g"
 * encodeRegex("/Hello World/g")
 */
export function encodeRegex(regexStr: string): string {
  // Extract the regex pattern and flags
  const regex = extractValidRegexes(regexStr)[0]
  if (!regex) return ''

  const encodedPattern = encode(regex.pattern)

  // Return in format 're/encoded-pattern/flags'
  return `re/${encodedPattern}/${regex.flags}`
}

/**
 * Decodes an encoded regex string back to original format
 * The decoding process:
 * 1. Restores uppercase letters from '^' prefix + lowercase
 * 2. URL decodes the pattern using decodeURIComponent
 * @param {string} encoded - The encoded regex string in format 're/encoded-pattern/flags'
 * @returns {string} Original regex string in format '/pattern/flags' or empty string if invalid
 * @example
 * // Returns "/abc/i"
 * decodeRegex("re/abc/i")
 * // Returns "/Hello World/g"
 * decodeRegex("re/^hello%20world/g")
 */
export function decodeRegex(encoded: string): string {
  try {
    // Check if the format is correct
    if (!encoded.startsWith('re/')) {
      return ''
    }

    // Find the last '/' to separate flags
    const lastSlashIndex = encoded.lastIndexOf('/')
    if (lastSlashIndex <= 3) return '' // 're/' is 3 chars

    const encodedPattern = encoded.slice(3, lastSlashIndex)
    const flags = encoded.slice(Math.max(0, lastSlashIndex + 1))

    const pattern = decode(encodedPattern)

    if (!pattern) return ''

    // Validate the decoded regex
    const _ = new RegExp(pattern, flags)

    // Return in original format
    return `/${pattern}/${flags}`
  } catch (error) {
    console.warn('Failed to decode regex:', error)
    return ''
  }
}

/**
 * Creates a RegExp object from an encoded regex string
 * @param {string} encoded - The encoded regex string
 * @returns {RegExp|null} The RegExp object or null if invalid
 * @example
 * // Returns /abc[def]/i
 * createRegexFromEncoded("re/ywjjw2rlzl0e/i")
 */
// This eslint rule for keeping using null not undefined
// eslint-disable-next-line @typescript-eslint/ban-types
export function createRegexFromEncoded(encoded: string): RegExp | null {
  const decodedStr = decodeRegex(encoded)
  if (!decodedStr) return null

  return createRegexFromString(decodedStr)
}

/**
 * Encodes a string using URL encoding and custom character transformations
 * @param {string} str - String to encode
 * @returns {string} Encoded string with uppercase converted to '^' + lowercase
 * @private
 */
function encode(str: string) {
  // First use encodeURIComponent for encoding
  let encoded = encodeURIComponent(str)
  // Convert uppercase letters to lowercase with '^' prefix
  encoded = encoded.replaceAll(/[A-Z]/g, function (char) {
    return '^' + String.fromCodePoint(char.codePointAt(0)! + 32)
  })
  // Remove spaces and commas
  encoded = encoded.replaceAll(/[ ,]/g, '')
  return encoded
}

/**
 * Decodes a string by reversing the custom encoding and URL encoding
 * @param {string} str - String to decode
 * @returns {string|null} Decoded string or null if decoding fails
 * @private
 */
function decode(str: string) {
  // First restore uppercase letters from '^' prefix + lowercase
  let decoded = str.replaceAll(/\^([a-z])/g, function (_, char: string) {
    return String.fromCodePoint(char.codePointAt(0)! - 32)
  })
  // Use decodeURIComponent to restore the original string
  try {
    decoded = decodeURIComponent(decoded)
  } catch (error) {
    console.error('Decoding error:', error)
    return null
  }

  return decoded
}
