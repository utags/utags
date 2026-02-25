import { s1j1 } from '../../utils/atob'
import { Discuz } from '../z001/042-discuz'

const discuz = new Discuz({
  matchesPatternValue: /xs[i1]jishe\.\w+|s[j1]s47\.\w+|s[j1]slt\.cc/,
  normalizeDomainFn(url: string) {
    return url.replace(
      /^https:\/\/(xs[i1]jishe\.\w+|s[j1]s47\.\w+|s[j1]slt\.cc)/,
      `https://x${s1j1}she.net`
    )
  },
  validateDefaultReturnValue: false,
})

export default discuz
