import assert from "assert"
import plugin from "../../src"
import { version } from "../../package.json"
const expectedMeta = {
  name: "eslint-plugin-astro",
  version,
}

describe("Test for meta object", () => {
  it("A plugin should have a meta object.", () => {
    assert.strictEqual(plugin.meta.name, expectedMeta.name)
    assert.strictEqual(typeof plugin.meta.version, "string")
  })

  for (const [name, processor] of Object.entries(plugin.processors)) {
    it(`"${name}" processor should have a meta object.`, () => {
      // @ts-expect-error -- missing type
      assert.strictEqual(processor.meta.name, expectedMeta.name)
      // @ts-expect-error -- missing type
      assert.strictEqual(typeof processor.meta.version, "string")
    })
  }
})
