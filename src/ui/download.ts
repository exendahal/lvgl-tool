export function downloadText(fileName: string, text: string): void {
  downloadBlob(fileName, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

export function downloadBytes(fileName: string, bytes: Uint8Array): void {
  downloadBlob(fileName, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }));
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
