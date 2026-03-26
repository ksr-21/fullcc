import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Start the app
        # Note: We assume the server is already running or we can start it.
        # Since I can't easily start a long-running process and wait for it in this script without complex logic,
        # I'll just try to connect to the local port if it's already up, or assume Jules handles the server.

        try:
            await page.goto("http://localhost:5173", timeout=10000)
            # Wait for some content to load
            await page.wait_for_timeout(5000)

            # Check for console errors
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            await page.screenshot(path="verification_after_fix.png", full_page=True)

            if errors:
                print("Console errors found:")
                for err in errors:
                    print(err)
            else:
                print("No console errors found.")

        except Exception as e:
            print(f"Error during verification: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
