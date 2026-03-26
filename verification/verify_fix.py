import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(record_video_dir="verification/video")
        page = await context.new_page()
        try:
            print("Navigating to http://localhost:5173...")
            await page.goto("http://localhost:5173", wait_until="networkidle")
            await asyncio.sleep(2)

            # Proof 1: The landing page is visible (not blank)
            await page.screenshot(path="verification/landing_ok.png")
            print("Landing page screenshot saved.")

            # Look for Log In button
            login_btn = page.get_by_role("button", name="Log In")
            if await login_btn.is_visible():
                print("Found 'Log In' button.")
                await login_btn.click()
                await asyncio.sleep(2)
                await page.screenshot(path="verification/login_ok.png")
                print("Login page screenshot saved.")
            else:
                print("'Log In' button NOT visible.")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            await context.close()
            await browser.close()

asyncio.run(run())
