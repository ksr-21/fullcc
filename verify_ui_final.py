import asyncio
import json
import os
from playwright.async_api import async_playwright

async def verify_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})

        mock_user = {
            "id": "test-user-id",
            "uid": "test-user-id",
            "displayName": "Test User",
            "name": "Test User",
            "email": "test@example.com",
            "photoURL": "https://via.placeholder.com/150",
            "role": "student",
            "tag": "Student",
            "collegeId": "test-college-id",
            "department": "Computer Science",
            "yearOfStudy": 3,
            "division": "A"
        }
        mock_college = {
            "id": "test-college-id",
            "name": "Test University",
            "shortName": "TestU",
            "adminUids": ["test-user-id"],
            "classes": {
                "Computer Science": {
                    "3": ["A"]
                }
            }
        }

        # Set localStorage before the page loads
        user_json = json.dumps(mock_user)
        college_json = json.dumps(mock_college)

        await context.add_init_script(f"""
            window.localStorage.setItem('user', '{user_json}');
            window.localStorage.setItem('college', '{college_json}');
            window.localStorage.setItem('token', 'dummy-token');
        """)

        page = await context.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # Mock APIs
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
            body=json.dumps([
                {
                    "id": "post-1",
                    "authorId": "test-user-id",
                    "content": "Professional post with a limited height image.",
                    "mediaUrls": ["https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=800"],
                    "timestamp": 1625097600000,
                    "collegeId": "test-college-id",
                    "comments": [],
                    "reactions": {}
                },
                {
                    "id": "event-1",
                    "authorId": "test-user-id",
                    "content": "Exciting campus event!",
                    "isEvent": True,
                    "eventDetails": {
                        "title": "Hackathon 2024",
                        "description": "Code for the future.",
                        "date": "2024-12-01T10:00:00Z",
                        "location": "Main Auditorium"
                    },
                    "timestamp": 1625097600000,
                    "collegeId": "test-college-id",
                    "comments": [],
                    "reactions": {}
                }
            ])
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

        # Navigate to Home Page
        print("Navigating to Home Page...")
        await page.goto("http://localhost:5173/#/home")

        # Wait for the Pulse heading or some other element that indicates the app is rendered
        try:
            await page.wait_for_selector("text=Pulse", timeout=10000)
            print("Successfully rendered app content.")
        except:
            print("Timed out waiting for app content. Taking screenshot anyway.")

        await page.wait_for_timeout(2000)
        await page.screenshot(path="verify_home_final.png")
        print("Captured verify_home_final.png")

        # Navigate to Search Page
        print("Navigating to Search Page...")
        await page.goto("http://localhost:5173/#/search")
        try:
            await page.wait_for_selector("text=Trending Now", timeout=10000)
        except:
            pass
        await page.wait_for_timeout(2000)
        await page.screenshot(path="verify_search_final.png")
        print("Captured verify_search_final.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ui())
