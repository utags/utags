<script>
  import { getFaviconUrl } from '../utils'
  let { href, classNames = '', size = 16 } = $props()
</script>

<img
  src={getFaviconUrl(href, size)}
  class={classNames}
  loading="lazy"
  alt="favicon" />
