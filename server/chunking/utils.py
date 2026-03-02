import asyncio


async def stream_as_async(sync_iterable):
    """
    Convert a sync iterable to an async generator for ASGI streaming.

    Django's ASGI handler buffers sync iterators into a list before streaming,
    which is catastrophic for large files. This utility runs the sync iteration
    in a background thread and yields chunks through an asyncio queue,
    enabling true real-time streaming under ASGI.
    """
    loop = asyncio.get_running_loop()
    done = object()
    queue = asyncio.Queue(maxsize=4)

    def _produce():
        try:
            for item in sync_iterable:
                asyncio.run_coroutine_threadsafe(queue.put(item), loop).result()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(done), loop).result()

    loop.run_in_executor(None, _produce)

    while True:
        item = await queue.get()
        if item is done:
            break
        yield item
