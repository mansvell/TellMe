const encoder = new TextEncoder();

self.onmessage = async (event: MessageEvent<{ salt: string }>) => {
    try {
        for (let start = 0; start < 4_000_000; start += 128) {
            const hashes = await Promise.all(Array.from({ length: 128 }, (_, index) =>
                crypto.subtle.digest("SHA-256", encoder.encode(`${event.data.salt}:${start + index}`)),
            ));
            const index = hashes.findIndex(hash => {
                const bytes = new Uint8Array(hash);
                return bytes[0] === 0 && bytes[1] === 0;
            });
            if (index >= 0) { self.postMessage({ nonce: String(start + index) }); return; }
        }
        self.postMessage({ error: true });
    } catch {
        self.postMessage({ error: true });
    }
};

export {};
