const fs = require('fs');
const path = require('path');

function readInput() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('close', () => resolve(data.trim()));
  });
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function extractSummary(payload) {
  const request = firstNonEmpty(
    payload?.user_message,
    payload?.userMessage,
    payload?.request,
    payload?.input?.user_message,
    payload?.input?.userMessage,
    payload?.session?.last_user_message,
    payload?.session?.lastUserMessage
  );

  const answer = firstNonEmpty(
    payload?.agent_message,
    payload?.agentMessage,
    payload?.response,
    payload?.output,
    payload?.message,
    payload?.session?.last_agent_message,
    payload?.session?.lastAgentMessage
  );

  const command = firstNonEmpty(
    payload?.command,
    payload?.tool_name,
    payload?.toolName,
    payload?.event,
    payload?.type
  );

  return {
    request: request || 'Session ended',
    answer: answer || 'Summary was captured by the stop hook.',
    command: command || 'stop'
  };
}

async function main() {
  const rawInput = await readInput();
  let payload = {};

  if (rawInput) {
    try {
      payload = JSON.parse(rawInput);
    } catch (error) {
      payload = { rawInput };
    }
  }

  const summary = extractSummary(payload);
  const summaryPath = path.join(process.cwd(), '.cursor', 'session-summary.md');
  const timestamp = new Date().toISOString();

  const entry = [
    `## ${timestamp}`,
    `- Request: ${summary.request.replace(/\r?\n/g, ' ')}`,
    `- Answer / Changes: ${summary.answer.replace(/\r?\n/g, ' ')}`,
    `- Files / Commands: ${summary.command}`,
    `- Follow-up: none`,
    ''
  ].join('\n');

  const existing = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf8') : '# Session Summary\n';
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  const nextContent = `${existing}${separator}${entry}`;
  fs.writeFileSync(summaryPath, nextContent, 'utf8');

  process.stdout.write(JSON.stringify({ permission: 'allow' }));
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(0);
});
