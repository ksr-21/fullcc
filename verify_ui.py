import asyncio
import json
import os
from playwright.async_api import async_playwright

async def verify_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        mock_user = {
            "uid": "test-user-id",
            "displayName": "Test User",
            "email": "test@example.com",
            "photoURL": "https://via.placeholder.com/150",
            "role": "student",
            "tag": "Student",
            "collegeId": "test-college-id"
        }
        mock_college = {
            "id": "test-college-id",
            "name": "Test University",
            "shortName": "TestU",
            "adminUids": ["test-user-id"]
        }

        # Navigate to the site first to be on the right domain
        await page.goto("http://localhost:5173")

        # Set the state in localStorage using arguments to avoid escaping issues
        user_json = json.dumps(mock_user)
        college_json = json.dumps(mock_college)

        await page.evaluate("([key, value]) => window.localStorage.setItem(key, value)", ["user", user_json])
        await page.evaluate("([key, value]) => window.localStorage.setItem(key, value)", ["college", college_json])

        # Reload to apply changes and navigate to specific routes
        await page.goto("http://localhost:5173/#/home")
        await page.wait_for_timeout(3000) # Give it time to load and render
        await page.screenshot(path="verify_home.png")
        print("Captured verify_home.png")

        # Navigate to Search Page
        await page.goto("http://localhost:5173/#/search")
        await page.wait_for_timeout(3000)
        await page.screenshot(path="verify_search.png")
        print("Captured verify_search.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ui())
