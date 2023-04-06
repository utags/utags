export {}
console.log(
  "HELLO WORLD FROM BGSCRIPTS",
  // eslint-disable-next-line n/prefer-global/process
  process.env.PLASMO_TARGET,
  // eslint-disable-next-line n/prefer-global/process
  process.env.PLASMO_TAG
)
