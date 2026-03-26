import asyncio
import json
import os
from playwright.async_api import async_playwright

async def verify_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        mock_user = {
            "id": "test-user-id",
            "uid": "test-user-id",
            "displayName": "Test User",
            "name": "Test User",
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

        # Set the state in localStorage
        user_json = json.dumps(mock_user)
        college_json = json.dumps(mock_college)

        await page.evaluate("([key, value]) => window.localStorage.setItem(key, value)", ["user", user_json])
        await page.evaluate("([key, value]) => window.localStorage.setItem(key, value)", ["college", college_json])
        await page.evaluate("() => window.localStorage.setItem('token', 'dummy-token')")

        # We need to mock the API response for the user profile if App.tsx fetches it
        # App.tsx: const doc = await db.collection('users').doc(user.uid).get();
        # This calls GET /api/users/test-user-id

        await page.route("**/api/users/test-user-id", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_user)
        ))

        await page.route("**/api/colleges/test-college-id", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_college)
        ))

        # Mock other common API calls to avoid failures
        await page.route("**/api/posts**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/groups**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/stories**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/notices**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/conversations**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/invites**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/courses**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        ))
        await page.route("**/api/colleges", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([mock_college])
        ))

        # Reload to apply changes and navigate to specific routes
        await page.goto("http://localhost:5173/#/home")
        await page.wait_for_timeout(5000)
        await page.screenshot(path="verify_home_fixed.png")
        print("Captured verify_home_fixed.png")

        # Navigate to Search Page
        await page.goto("http://localhost:5173/#/search")
        await page.wait_for_timeout(5000)
        await page.screenshot(path="verify_search_fixed.png")
        print("Captured verify_search_fixed.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ui())
