<script lang="ts">
  import { ArrowLeft, ArrowUpRight, Check, Copy, ExternalLink, Terminal, Cloud, Server, ShieldCheck } from '@lucide/svelte';

  type Harness = {
    name: string;
    logo: string;
    kind: string;
    description: string;
    homepage: string;
    docs: string;
    command?: string;
    steps: string;
  };

  const harnesses: Harness[] = [
    { name: 'Cursor', logo: 'cursor', kind: 'IDE + terminal', description: 'Agent-first editor with local, cloud, and terminal agents.', homepage: 'https://cursor.com/', docs: 'https://docs.cursor.com/en/cli/installation', command: 'curl https://cursor.com/install -fsS | bash', steps: 'Install the editor or CLI, open a repository, then describe the task to Agent.' },
    { name: 'Claude Code', logo: 'claude', kind: 'Terminal', description: 'Anthropic’s agentic coding tool for working directly in a repository.', homepage: 'https://claude.com/product/claude-code', docs: 'https://docs.anthropic.com/en/docs/claude-code/getting-started', command: 'npm install -g @anthropic-ai/claude-code', steps: 'Install it, run claude inside your project, and sign in or configure a supported provider.' },
    { name: 'Codex', logo: 'openai', kind: 'Terminal + cloud', description: 'OpenAI’s coding agent for local repositories, tasks, and automations.', homepage: 'https://openai.com/codex/', docs: 'https://developers.openai.com/codex/cli', command: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh', steps: 'Install it, run codex in the project folder, then sign in and give it a scoped task.' },
    { name: 'Gemini CLI', logo: 'googlegemini', kind: 'Terminal', description: 'Google’s open-source agent for coding and command-line workflows.', homepage: 'https://geminicli.com/', docs: 'https://geminicli.com/docs/get-started/', command: 'npm install -g @google/gemini-cli', steps: 'Run gemini in your project and complete the first-run authentication flow.' },
    { name: 'OpenCode', logo: 'opencode', kind: 'Terminal + IDE', description: 'Open-source coding agent that works with many model providers.', homepage: 'https://opencode.ai/', docs: 'https://opencode.ai/en/docs', command: 'curl -fsSL https://opencode.ai/install | bash', steps: 'Start opencode in a repository, use /connect to add a provider, then run /init for project instructions.' },
    { name: 'GitHub Copilot', logo: 'githubcopilot', kind: 'IDE + terminal', description: 'GitHub’s coding agent for your editor, terminal, GitHub, and cloud tasks.', homepage: 'https://github.com/features/copilot', docs: 'https://docs.github.com/en/copilot/get-started/cli-quickstart', command: 'npm install -g @github/copilot', steps: 'Run copilot in a trusted project folder, use /login to authenticate, then approve the agent’s proposed tools and edits.' },
    { name: 'Cline', logo: 'cline', kind: 'IDE + terminal', description: 'Open-source, provider-flexible agent available in editors and the CLI.', homepage: 'https://cline.bot/', docs: 'https://docs.cline.bot/cline-cli/installation', command: 'npm install -g cline', steps: 'Run cline auth to connect a model, then start an interactive task or install the editor extension.' },
    { name: 'Roo Code', logo: 'roocode', kind: 'IDE', description: 'Open-source coding agent delivered as a VS Code-compatible extension.', homepage: 'https://roocode.com/', docs: 'https://roocodeinc.github.io/Roo-Code/getting-started/installing/', steps: 'Open your editor’s Extensions view, search for Roo Code, install it, and select a provider in the Roo panel.' },
    { name: 'Kilo Code', logo: 'kilocode', kind: 'IDE + terminal', description: 'Open-source agent for VS Code, JetBrains, and command-line workflows.', homepage: 'https://kilo.ai/', docs: 'https://kilo.ai/docs/code-with-ai/platforms/cli', command: 'npm install -g @kilocode/cli', steps: 'Run kilo in your project, then use /connect to add your model credentials.' },
    { name: 'Continue', logo: 'continuedev', kind: 'IDE + terminal', description: 'Open-source agent with IDE extensions and a terminal-first CLI.', homepage: 'https://www.continue.dev/', docs: 'https://docs.continue.dev/cli/quickstart', command: 'curl -fsSL https://raw.githubusercontent.com/continuedev/continue/main/extensions/cli/scripts/install.sh | bash', steps: 'Run cn in a project, sign in or provide a supported API key, and approve tools as needed.' },
    { name: 'Aider', logo: 'aider', kind: 'Terminal', description: 'Git-aware AI pair programming that edits code directly from your terminal.', homepage: 'https://aider.chat/', docs: 'https://aider.chat/docs/', command: 'python -m pip install aider-install && aider-install', steps: 'Set up a model provider key, enter your Git repository, and run aider with the files or task you want to work on.' },
    { name: 'Qwen Code', logo: 'qwen', kind: 'Terminal', description: 'Qwen’s agentic coding tool with first-party and third-party model options.', homepage: 'https://qwenlm.github.io/qwen-code-docs/en/', docs: 'https://qwenlm.github.io/qwen-code-docs/en/users/overview/', command: 'npm install -g @qwen-code/qwen-code@latest', steps: 'Run qwen in a repository and use the first-run /auth flow to choose a provider.' },
    { name: 'Amp', logo: 'sourcegraph', kind: 'Terminal + cloud', description: 'An agent that can run locally, in a cloud Orb, or on a connected runner.', homepage: 'https://ampcode.com/', docs: 'https://ampcode.com/docs/cli', command: 'curl -fsSL https://ampcode.com/install.sh | bash', steps: 'Run amp, sign in when prompted, then start with a narrow task in your repository.' },
    { name: 'OpenHands', logo: 'openhands', kind: 'Self-hosted + cloud', description: 'A self-hostable agent platform and control center for coding workflows.', homepage: 'https://openhands.dev/', docs: 'https://docs.openhands.dev/', command: 'npm install -g @openhands/agent-canvas', steps: 'Choose a local or Docker-backed setup, start agent-canvas, and connect a model or ACP-compatible agent.' },
    { name: 'Goose', logo: 'block', kind: 'Desktop + terminal', description: 'A general-purpose, local open-source agent with MCP and subagents.', homepage: 'https://block.github.io/goose/', docs: 'https://block.github.io/goose/docs/getting-started/installation/', command: 'curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash', steps: 'Install the desktop app or CLI, pick a provider on first launch, then add extensions only as needed.' },
    { name: 'OpenClaw', logo: 'openclaw', kind: 'Personal agent', description: 'A self-hosted assistant for messaging, work, and always-on personal workflows.', homepage: 'https://openclaw.ai/', docs: 'https://docs.openclaw.ai/', command: 'curl -fsSL https://openclaw.ai/install.sh | bash', steps: 'Run openclaw onboard, choose a model provider, then connect only the messaging channels and tools you trust.' },
    { name: 'Hermes Agent', logo: 'nousresearch', kind: 'Personal agent', description: 'Nous Research’s self-improving agent with a built-in learning loop.', homepage: 'https://hermes-agent.nousresearch.com/', docs: 'https://hermes-agent.nousresearch.com/docs/', command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash', steps: 'Run hermes, select a model with hermes model, and configure tools before giving it broader access.' },
    { name: 'Devin Desktop', logo: 'windsurf', kind: 'IDE + cloud', description: 'Cognition’s agent workspace, formerly Windsurf, for local and cloud agents.', homepage: 'https://windsurf.com/editor', docs: 'https://docs.windsurf.com/', steps: 'Download the desktop app, sign in, open or clone a repository, and delegate a task from the agent workspace.' },
  ];

  let copied = $state('');
  async function copy(command: string, name: string) {
    try { await navigator.clipboard.writeText(command); copied = name; }
    catch { copied = ''; }
  }
</script>

<svelte:head>
  <title>Agent harnesses — Skilly</title>
  <meta name="description" content="A practical directory of popular AI agent harnesses, with official homepages and quick-start instructions." />
</svelte:head>

<main id="main" class="harnesses">
  <a class="back" href="/"><ArrowLeft size={16}/> All skills</a>
  <section class="harness-hero">
    <div>
      <span class="eyebrow"><i></i> THE AGENT HARNESS INDEX</span>
      <h1>Pick your<br/><span>agent’s home.</span></h1>
      <p>Agent harnesses are the environments that give a model context, tools, memory, permissions, and a way to get work done. Here are the popular options—from Cursor to OpenClaw and Hermes—with the official place to start each one.</p>
    </div>
    <aside class="harness-brief">
      <span class="mono">START HERE</span>
      <strong>{harnesses.length} popular harnesses</strong>
      <p>Choose one that fits where you work, begin with the minimum permissions, and keep your changes in Git.</p>
    </aside>
  </section>

  <section class="harness-principles" aria-label="Safe agent setup principles">
    <article><Terminal size={20}/><div><strong>Start in a project folder</strong><span>Give the agent a bounded workspace, not your entire machine.</span></div></article>
    <article><ShieldCheck size={20}/><div><strong>Review before broad access</strong><span>Connect keys, browsers, or messaging only when the task calls for it.</span></div></article>
    <article><Server size={20}/><div><strong>Use Git checkpoints</strong><span>Commit or stash before an agent makes a meaningful change.</span></div></article>
  </section>

  <section class="skilly-in-harness" aria-labelledby="skilly-in-harness-title">
    <div>
      <span class="eyebrow muted">SKILLY.SH IN ANY HARNESS</span>
      <h2 id="skilly-in-harness-title">Find a skill. Add it in your project<span>.</span></h2>
      <p>Skilly helps you find the capability; your harness uses it inside the repository you have open. Review the publisher’s instructions before installing.</p>
    </div>
    <ol>
      <li><span>01</span><p><a href="/">Browse Skilly</a>, open a skill, and read its original instructions and source.</p></li>
      <li><span>02</span><p>Copy the install command, then run it from this harness’s project terminal: <code>npx skills add owner/repo --skill name</code>.</p></li>
      <li><span>03</span><p>Select your harness in the installer when it is offered, then reopen the project or start a fresh agent task so it reads the new skill.</p></li>
    </ol>
  </section>

  <section class="harness-directory">
    <div class="section-title"><div><span class="eyebrow muted">OFFICIAL LINKS + FIRST STEPS</span><h2>Find the right harness<span>.</span></h2></div><span class="index-label mono">THE DIRECTORY ↙</span></div>
    <div class="harness-grid">
      {#each harnesses as harness, index}
        <article class="harness-card">
          <div class="harness-card-top"><span class="harness-number mono">{String(index + 1).padStart(2, '0')}</span><span class="category-tag">{harness.kind}</span></div>
          <div class="harness-brand"><span class="harness-logo" aria-hidden="true"><span>{harness.name.slice(0, 1)}</span><img src={`https://cdn.simpleicons.org/${harness.logo}/DCE4CD`} alt="" /></span><span class="mono">{harness.name}</span></div>
          <h3>{harness.name}</h3>
          <p>{harness.description}</p>
          <div class="harness-links">
            <a href={harness.homepage} target="_blank" rel="noreferrer">Homepage <ExternalLink size={14}/></a>
            <a href={harness.docs} target="_blank" rel="noreferrer">Setup guide <ArrowUpRight size={14}/></a>
          </div>
          {#if harness.command}
            <div class="harness-command"><span class="mono">INSTALL</span><code>{harness.command}</code><button onclick={() => copy(harness.command!, harness.name)} aria-label={`Copy ${harness.name} install command`}>{#if copied === harness.name}<Check size={15}/>{:else}<Copy size={15}/>{/if}</button></div>
          {/if}
          <div class="harness-steps"><span class="mono">TAKE IT INTO USE</span><p>{harness.steps}</p></div>
          <div class="harness-skilly"><span class="mono">ADD A SKILLY SKILL</span><p>Open a skill on Skilly, copy its command, and run it in this {harness.name} project. Choose {harness.name} in the installer if it appears.</p></div>
        </article>
      {/each}
    </div>
  </section>
  <section class="harness-closing"><Cloud size={22}/><div><span class="eyebrow">ONE MORE THING</span><h2>The harness is the start.<br/><span>Skills make it yours.</span></h2><p>Once your agent is ready, return to the directory to add focused capabilities for the work you actually do.</p><a class="hero-link" href="/#directory">Explore skills <ArrowUpRight size={18}/></a></div></section>
</main>
