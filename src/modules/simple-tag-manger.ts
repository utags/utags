export async function simplePrompt(message: string, value: string | undefined) {
  // eslint-disable-next-line no-alert
  return prompt(message, value)
}
