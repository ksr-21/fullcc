import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Monitor console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        print("Navigating to login page...")
        await page.goto("http://localhost:5173/#/login")

        print("Filling login form...")
        # Use IDs instead of placeholders to be more robust
        await page.fill('input#email', "test@gmail.com")
        await page.fill('input#password', "password123")

        print("Clicking login button...")
        await page.click('button[type="submit"]')

        print("Waiting for redirection...")
        try:
            # For Director, it should redirect to #/director
            await page.wait_for_function("window.location.hash === '#/director'", timeout=10000)
            print("Successfully redirected to #/director")
        except:
            print(f"Redirection failed. Current hash: {await page.evaluate('window.location.hash')}")

        storage = await page.evaluate("JSON.stringify(localStorage)")
        print(f"LocalStorage: {storage}")

        # Navigate to profile
        print("Navigating to profile...")
        await page.goto("http://localhost:5173/#/profile")
        await page.wait_for_timeout(3000)

        await page.screenshot(path="verification/screenshots/profile_debug.png")

        # Check for Edit Profile button
        # Use a more specific selector
        edit_btn = await page.query_selector('button:has-text("Edit Profile")')

        if edit_btn:
            print("Edit Profile button found. Clicking it...")
            await edit_btn.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path="verification/screenshots/edit_modal_debug.png")

            # Check if name input is read-only
            # In the modal, find the name input.
            # Usually labeled "Full Name" or similar.
            name_input = await page.query_selector('input[value="test"]')
            if name_input:
                is_readonly = await name_input.get_attribute("readonly")
                print(f"Name input readonly attribute: {is_readonly}")
            else:
                # Try finding by label or class if value match fails (though value should be 'test')
                print("Name input by value 'test' not found, trying generic input")
                inputs = await page.query_selector_all('input')
                for idx, inp in enumerate(inputs):
                    val = await inp.get_attribute("value")
                    ro = await inp.get_attribute("readonly")
                    print(f"Input {idx}: value='{val}', readonly='{ro}'")
        else:
            print("Edit Profile button NOT found")
            # Log all button texts
            buttons = await page.query_selector_all("button")
            texts = [await b.inner_text() for b in buttons]
            print(f"Available buttons: {texts}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
