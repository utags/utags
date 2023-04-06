import * as esbuild from "esbuild"

const EMOJI_LIST = [
  "⚽️",
  "🏀",
  "🏈",
  "⚾️",
  "🥎",
  "🎾",
  "🏐",
  "🏉",
  "🥏",
  "🎱",
]

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

export const logger = (target, emoji) => {
  emoji = emoji || EMOJI_LIST[getRandomInt(EMOJI_LIST.length)]
  return (message) => {
    console.log(`${emoji} [target: ${target}]`, message)
  }
}

export const getBuildOptions = (target, tag, fileName = "content") => {
  return {
    entryPoints: [`src/${fileName}.ts`],
    bundle: true,
    define: {
      "process.env.PLASMO_TARGET": `"${target}"`,
      "process.env.PLASMO_TAG": `"${tag}"`,
    },
    alias: {
      [`data-text:./${fileName}.scss`]: `src/${fileName}.scss`,
    },
    loader: {
      ".scss": "text",
    },
    target: ["chrome58", "firefox57", "safari11", "edge16"],
    outfile: `build/${target}-${tag}/${fileName}.js`,
  }
}

export const runDevServer = async (buildOptions, target, tag) => {
  const log = logger(target)
  const ctx = await esbuild.context(buildOptions)

  await ctx.watch()
  log("watching...")

  const { host, port } = await ctx.serve({
    servedir: `build/${target}-${tag}`,
  })
  log(`Server is running at http://localhost:${port}/`)
  log("Hit CTRL-C to stop the server")

  return { host, port }
}
