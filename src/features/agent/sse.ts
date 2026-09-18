import type { RunEvent } from './types'

/** 按 SSE 行协议解析；解码器保留跨网络分块的 UTF-8 字节。 */
export async function consumeEvents(
  body: ReadableStream<Uint8Array>,
  receive: (event: RunEvent) => void
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let data: string[] = []
  const readLine = (line: string) => {
    if (!line) {
      if (data.length) receive(JSON.parse(data.join('\n')) as RunEvent)
      data = []
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''))
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let match: RegExpExecArray | null
      while ((match = /\r\n|\n|\r/.exec(buffer))) {
        // CR 可能是尚未收全的 CRLF；留到下一个分块处理。
        if (!done && match[0] === '\r' && match.index === buffer.length - 1) break
        readLine(buffer.slice(0, match.index))
        buffer = buffer.slice(match.index + match[0].length)
      }
      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}
