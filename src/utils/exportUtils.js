export function exportVoyageLog(history) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    '# Caravels Voyage Log',
    `**Date**: ${date}`,
    `**Ports visited**: ${history.length}`,
    '',
    '| # | Port | Coordinates | Type |',
    '|---|------|-------------|------|',
  ];

  history.forEach((entry, i) => {
    const lat = entry.lat?.toFixed(2) ?? '—';
    const lng = entry.lng?.toFixed(2) ?? '—';
    lines.push(`| ${i + 1} | ${entry.name} | ${lat}, ${lng} | ${entry.type ?? '—'} |`);
  });

  return lines.join('\n');
}

export function downloadMarkdown(markdown, filename = 'caravels-voyage-log.md') {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
