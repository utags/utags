const failures = []

export function assertEquals(value1, value2) {
  if (value1 !== value2) {
    failures.push(
      new Error(`Assert failed: ${String(value1)} with ${String(value2)}`)
    )
  }
}

export async function runTest(name, func) {
  console.log("Start test", name)
  await func()

  if (failures.length === 0) {
    console.log("All test passed")
  } else {
    for (const failure of failures) {
      console.error(failure)
    }
  }
}
