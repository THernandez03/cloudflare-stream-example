const delayedChunk = (delay) =>
  new TransformStream({
    start(controller) {
      console.log('[start writable]');
    },
    transform(chunk, controller) {
      console.log('[write]', chunk);
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('[write-delayed]', chunk);
          controller.enqueue(chunk);
          resolve();
        }, delay);
      });
    },
    flush() {
      console.log('[flush]');
    },
  });

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === '/favicon.ico') {
      return new Response('', { status: 200 });
    }

    try {
      const searchParams = requestUrl.searchParams;
      const url = searchParams.get('url');
      const text = searchParams.get('text');

      if (url) {
        const transformStream = new TransformStream();
        const parsedUrl = new URL(url);
        const response = await fetch(parsedUrl);

        if (!response.ok) {
          return new Response(await response.text());
        }

        response.body
          .pipeThrough(delayedChunk(1_000))
          .pipeTo(transformStream.writable);

        return new Response(transformStream.readable, { status: 200 });
      }

      if (text) {
        const textEncoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();

        let index = 0;
        const intervalId = setInterval(() => {
          console.log(`[interval] - ${text[index]}`);
          writer.write(textEncoder.encode(text[index++]));
          if (!text[index]) {
            clearInterval(intervalId);
            writer.close();
          }
        }, 1_000);

        return new Response(transformStream.readable, { status: 200 });
      }

      return new Response('Hello World', { status: 200 });
    } catch (err) {
      console.log(err.stack);
      return new Response(err, { status: 500 });
    }
  },
};
