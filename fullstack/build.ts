await Bun.build({
  entrypoints: ["./server.ts"],
  target: "bun",
  loader: {
    ".png": "file",
    ".svg": "file",
    ".ico": "file",
    ".json": "file",
    ".webmanifest": "file",
  },
  naming: {
    asset: "[name].[ext]",
  },
  compile: {
    target: "bun-linux-x64", //change this to bun-darwin-arm64-modern for deploying on a mac in local dev. check out bun --compile docs
    execArgv: ["--smol"],
    outfile: "./fullstack",
  },
  minify: true,
  bytecode: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    VERSION: JSON.stringify("1.3.17"),
  },
});