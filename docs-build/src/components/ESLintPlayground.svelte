<script>
  import ESLintEditor from "./eslint/ESLintEditor.svelte"
  import RulesSettings from "./eslint/RulesSettings.svelte"
  import { loadMonacoEditor } from "./eslint/scripts/monaco-loader.mjs"
  import {
    deserializeState,
    serializeState,
  } from "./eslint/scripts/state/index.mjs"
  import {
    DEFAULT_RULES_CONFIG,
    getRule,
    createLinter,
    preprocess,
    postprocess,
  } from "./eslint/scripts/linter.mjs"

  let tsParser = undefined
  const linter = loadMonacoEditor().then(async () => {
    tsParser = await import("@typescript-eslint/parser")
    const pluginJsxA11y = await import("eslint-plugin-jsx-a11y")
    if (typeof window !== "undefined") {
      window.require.define("@typescript-eslint/parser", tsParser)
      window.require.define("eslint-plugin-jsx-a11y", pluginJsxA11y)
    }

    return createLinter()
  })

  const DEFAULT_CODE =
    `---
/* Welcome to eslint-plugin-astro */
let a = 1;
let b: number = 1;
// let c = 1;
---

<p>{a} + {b} + {c} = {a + b + c}</p>

<span class={
  'hello goodbye ' + (a ? 'hello' : '') + \` \${b ? 'world' : ''}\`
} />

<script define:vars={{a, b}}>
  console.log(a);
<` +
    `/script>
`
  const DEFAULT_FILE_PATH = "Example.astro"

  const state = deserializeState(
    (typeof window !== "undefined" && window.location.hash.slice(1)) || "",
  )
  let code = state.code || DEFAULT_CODE
  let rules = state.rules || Object.assign({}, DEFAULT_RULES_CONFIG)
  let messages = []
  let time = ""
  let optionsForAstro = {
    preprocess,
    postprocess,
  }
  let filePath = state.filePath || DEFAULT_FILE_PATH
  let editor

  $: serializedString = (() => {
    const serializeCode = DEFAULT_CODE === code ? undefined : code
    const serializeRules = equalsRules(DEFAULT_RULES_CONFIG, rules)
      ? undefined
      : rules
    const serializeFilePath =
      filePath === DEFAULT_FILE_PATH ? undefined : filePath
    return serializeState({
      code: serializeCode,
      rules: serializeRules,
      filePath: serializeFilePath,
    })
  })()
  $: {
    if (typeof window !== "undefined") {
      window.location.replace(`#${serializedString}`)
    }
  }
  function onLintedResult(evt) {
    messages = evt.detail.messages
    time = `${evt.detail.time}ms`
  }
  function onUrlHashChange() {
    const newSerializedString =
      (typeof window !== "undefined" && window.location.hash.slice(1)) || ""
    if (newSerializedString !== serializedString) {
      const state = deserializeState(newSerializedString)
      code = state.code || DEFAULT_CODE
      rules = state.rules || Object.assign({}, DEFAULT_RULES_CONFIG)
      filePath = state.filePath || DEFAULT_FILE_PATH
    }
  }

  /** */
  function equalsRules(a, b) {
    const akeys = Object.keys(a).filter((k) => a[k] !== "off")
    const bkeys = Object.keys(b).filter((k) => b[k] !== "off")
    if (akeys.length !== bkeys.length) {
      return false
    }

    for (const k of akeys) {
      if (a[k] !== b[k]) {
        return false
      }
    }
    return true
  }

  function onClickMessage(evt, msg) {
    evt.stopPropagation()
    evt.preventDefault()
    if (editor) {
      editor.setCursorPosition({
        start: {
          line: msg.line,
          column: msg.column,
        },
        end: {
          line: msg.endLine ?? msg.line,
          column: msg.endColumn ?? msg.column,
        },
      })
    }
  }
</script>

<svelte:window on:hashchange={onUrlHashChange} />

<div class="playground-root">
  <div class="playground-tools">
    <label style="margin-left: 16px"
      >FileName<input bind:value={filePath} /></label
    >
    <span style="margin-left: auto; margin-right: 16px">{time}</span>
  </div>
  <div class="playground-content">
    <RulesSettings bind:rules />
    <div class="editor-content">
      <ESLintEditor
        bind:this={editor}
        {linter}
        bind:code
        {filePath}
        config={{
          parser: "astro-auto-eslint-parser",
          parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parser: tsParser,
          },
          rules,
          env: {
            browser: true,
            es2021: true,
          },
          globals: {
            // Astro object
            Astro: false,
            // JSX Fragment
            Fragment: false,

            // Markdown properties
            Layout: false,
            frontmatter: false,
            metadata: false,
            rawContent: false,
            compiledContent: false,
          },
        }}
        options={filePath?.endsWith(".md") ? {} : optionsForAstro}
        on:result={onLintedResult}
      />
      <div class="messages">
        <ol>
          {#each messages as msg, i (`${msg.line}:${msg.column}:${msg.ruleId}@${i}`)}
            <li class="message">
              <!-- svelte-ignore a11y-invalid-attribute -->
              <a
                href="#"
                on:click={(evt) => onClickMessage(evt, msg)}
                class="message-link">[{msg.line}:{msg.column}]</a
              >:
              {msg.message}
              <a
                class="rule-link {getRule(msg.ruleId)?.classes}"
                class:is-rule-error={msg.ruleId}
                href={getRule(msg.ruleId)?.url}
                target="_blank"
                rel="noopener noreferrer">({msg.ruleId})</a
              >
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </div>
</div>

<style>
  .playground-root {
    height: calc(100vh - 180px);
  }
  .playground-tools {
    height: 24px;
    display: flex;
  }
  .playground-content {
    display: flex;
    flex-wrap: wrap;
    height: calc(100% - 16px);
    border: 1px solid #cfd4db;
    background-color: #282c34;
    color: #fff;
  }

  .playground-content > .editor-content {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #cfd4db;
    min-width: 1px;
  }

  .playground-content > .editor-content > .messages {
    height: 30%;
    width: 100%;
    overflow: auto;
    box-sizing: border-box;
    border-top: 1px solid #cfd4db;
    padding: 8px;
    font-size: 12px;
  }
  .playground-content
    > .editor-content
    > .messages
    .rule-link:not(.is-rule-error) {
    display: none;
  }
  .rule-link {
    transition: color 0.2s linear;
  }
  .rule-link.svelte-rule {
    color: #40b3ff80;
  }
  .rule-link.svelte-rule:hover {
    color: #40b3ff;
  }
  .rule-link.core-rule {
    color: #8080f280;
  }
  .rule-link.core-rule:hover {
    color: #8080f2;
  }
  .message-link {
    color: #40b3ff;
  }
</style>
