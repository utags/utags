import * as esbuild from "esbuild"
import fs from "node:fs"
import * as sass from "sass"

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

const schemeImportPlugin = ({ compressCss }) => ({
  name: "schemeImport",
  setup(build) {
    build.onResolve({ filter: /^[\w-]+:/ }, async (args) => {
      const result = await build.resolve(args.path.split(":")[1], {
        kind: "import-statement",
        resolveDir: args.resolveDir,
      })
      if (result.errors.length > 0) {
        return { errors: result.errors }
      }

      return { path: result.path, namespace: "schemeImport-ns" }
    })
    build.onLoad(
      { filter: /\.(s[ac]ss|css)$/, namespace: "schemeImport-ns" },
      async (args) => ({
        contents: (
          (await sass.compileAsync(args.path, {
            style: compressCss ? "compressed" : "expanded",
          })) || {
            css: "",
          }
        ).css,
        loader: "text",
      })
    )
    build.onLoad(
      { filter: /.*/, namespace: "schemeImport-ns" },
      async (args) => ({
        contents: await fs.promises.readFile(args.path),
        loader: "text",
      })
    )
  },
})

export const getBuildOptions = (target, tag, fileName = "content") => {
  return {
    entryPoints: [`src/${fileName}.ts`],
    bundle: true,
    plugins: [
      schemeImportPlugin({ compressCss: tag === "prod" || tag === "staging" }),
    ],
    define: {
      "process.env.PLASMO_TARGET": `"${target}"`,
      "process.env.PLASMO_TAG": `"${tag}"`,
    },
    target: ["chrome58", "firefox57", "safari11", "edge16"],
    outfile: `build/${target}-${tag}/${fileName}.js`,
  }
}

const waitUntilFileExists = async (path, timeout = 10_000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("File does not exits. " + path))
    }, timeout)

    const check = () => {
      if (fs.existsSync(path)) {
        clearTimeout(timeoutId)
        resolve()
        return
      }

      setTimeout(check, 100)
    }

    check()
  })
}

export const runDevServer = async (buildOptions, target, tag) => {
  const log = logger(target)
  const ctx = await esbuild.context(buildOptions)

  await ctx.watch()
  log("watching...")

  await waitUntilFileExists(buildOptions.outfile)

  const { host, port } = await ctx.serve({
    servedir: `build/${target}-${tag}`,
  })
  log(`Server is running at http://localhost:${port}/`)
  log("Hit CTRL-C to stop the server")

  return { host, port }
}
