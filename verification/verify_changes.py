import os
import subprocess
import time
from playwright.sync_api import sync_playwright

def run():
    # Start dev server in the background
    dev_server = subprocess.Popen(["npm", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(10) # Give it time to start

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/video")
        page = context.new_page()

        try:
            # Navigate to the app
            page.goto("http://localhost:5173")
            page.wait_for_timeout(2000)

            # Capture the login page
            page.screenshot(path="verification/verification.png")
            print("Captured verification screenshot.")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            context.close()
            browser.close()
            dev_server.terminate()

if __name__ == "__main__":
    os.makedirs("verification/video", exist_ok=True)
    run()
