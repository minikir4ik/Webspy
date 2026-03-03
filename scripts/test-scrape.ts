// Run with: npx tsx scripts/test-scrape.ts

const urls = [
  "https://gymshark.com/products/crest-t-shirt-black-aw24.json",
  "https://www.allbirds.com/products/mens-tree-runners.json",
];

async function testFetch(url: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${url}`);
  console.log("=".repeat(60));

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WebSpy/1.0 (Product Monitor)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get("content-type")}`);
    console.log(`Redirected: ${response.redirected}`);
    if (response.redirected) {
      console.log(`Final URL: ${response.url}`);
    }

    const text = await response.text();
    console.log(`Body length: ${text.length} chars`);

    if (response.ok) {
      try {
        const json = JSON.parse(text);
        const product = json.product;
        if (product) {
          console.log(`Product title: ${product.title}`);
          console.log(`Variants: ${product.variants?.length ?? 0}`);
          if (product.variants?.[0]) {
            const v = product.variants[0];
            console.log(`First variant price: ${v.price}`);
            console.log(`First variant available: ${v.available}`);
            console.log(`First variant compare_at_price: ${v.compare_at_price}`);
          }
        } else {
          console.log("No 'product' key in JSON. Keys:", Object.keys(json));
        }
      } catch {
        console.log("Body is not valid JSON. First 500 chars:");
        console.log(text.substring(0, 500));
      }
    } else {
      console.log("Response body (first 500 chars):");
      console.log(text.substring(0, 500));
    }
  } catch (err) {
    console.error("FETCH FAILED:", err);
  }
}

async function main() {
  // Also test a raw fetch with no special headers to isolate the issue
  console.log("\n>>> Basic connectivity test (httpbin)...");
  try {
    const r = await fetch("https://httpbin.org/get", { signal: AbortSignal.timeout(10000) });
    console.log(`httpbin status: ${r.status}`);
  } catch (err) {
    console.error("httpbin FAILED:", err);
  }

  for (const url of urls) {
    await testFetch(url);
  }
}

main();
