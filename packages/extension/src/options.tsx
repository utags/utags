function IndexOptions() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        width: '500px',
      }}>
      <h1>小鱼标签 (UTags)</h1>
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
          listStyleType: 'none',
          padding: 16,
        }}>
        <li>
          <a href="https://utags.link/" target="_blank">
            链接列表
          </a>
        </li>
        <li>
          <a href="https://utags.link/" target="_blank">
            导出数据/导入数据
          </a>
        </li>
      </ul>
      <footer>
        Made with ❤️ by{' '}
        <a href="https://www.pipecraft.net/" target="_blank">
          Pipecraft
        </a>
      </footer>
    </div>
  )
}

export default IndexOptions
