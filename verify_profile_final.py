import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        print("Logging in as Director (test@gmail.com)...")
        await page.goto("http://localhost:5173/#/login")
        await page.fill('input#email', "test@gmail.com")
        await page.fill('input#password', "password123")
        await page.click('button[type="submit"]')

        await page.wait_for_function("window.location.hash === '#/director'", timeout=10000)

        # Get user ID from localStorage
        storage = await page.evaluate("localStorage.getItem('user')")
        user_data = json.loads(storage)
        user_id = user_data['id']
        print(f"Logged in as {user_id}")

        # 1. Verify Profile Page Redesign & Read-Only Name for self
        print(f"Navigating to own profile: #/profile/{user_id}")
        await page.goto(f"http://localhost:5173/#/profile/{user_id}")
        await page.wait_for_selector('button:has-text("Edit Profile")')
        await page.screenshot(path="verification/screenshots/profile_redesign_final.png")

        print("Opening Edit Profile Modal...")
        await page.click('button:has-text("Edit Profile")')
        await page.wait_for_selector('input#name')

        name_input = page.locator('input#name')
        is_readonly = await name_input.get_attribute("readonly")
        print(f"Own Name field is readonly: {is_readonly is not None}")

        await page.screenshot(path="verification/screenshots/own_edit_modal.png")
        await page.click('button:has-text("Cancel")')

        # 2. Verify Director can edit someone else's name
        print("Navigating back to Director Dashboard -> Students")
        await page.goto("http://localhost:5173/#/director")
        # Click on Student Database in sidebar
        await page.click('button:has-text("Student Database")')

        # Wait for student list
        await page.wait_for_selector('table')

        # Find first edit button in the table
        # The first user might be the director themselves if they are listed?
        # No, Student Directory only lists students.

        edit_buttons = page.locator('button[title="Edit User"]')
        count = await edit_buttons.count()
        print(f"Found {count} students with edit buttons.")

        if count > 0:
            await edit_buttons.first.click()
            await page.wait_for_selector('input[value]') # Wait for modal with value

            # In Director's EditUserModal, the name field should NOT be readonly
            admin_name_input = page.locator('form input').first # Name is the first input
            is_readonly_admin = await admin_name_input.get_attribute("readonly")
            print(f"Admin editing someone else - Name field is readonly: {is_readonly_admin is not None}")

            await page.screenshot(path="verification/screenshots/admin_edit_other_modal.png")
        else:
            print("No students found to test admin editing.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
