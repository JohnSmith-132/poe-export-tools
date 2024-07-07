import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from urllib.parse import urlparse
import time
from dotenv import load_dotenv
import logging
import re
import concurrent.futures
import hashlib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("start-maximized")
    return webdriver.Chrome(options=options)

def login_to_poe(driver, email):
    try:
        # Navigate to the login page
        logging.info("Navigating to login page...")
        driver.get("https://poe.com/login")
        
        # Wait for the email input field to be present
        logging.info("Waiting for email input field...")
        email_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        
        # Enter email
        logging.info("Entering email...")
        email_input.send_keys(email)
        
        # Find and click the "Go" button
        logging.info("Clicking Go button...")
        go_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='Go']"))
        )
        go_button.click()
        
        # Wait for the verification code input field
        logging.info("Waiting for verification code input...")
        verification_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input.VerificationCodeInput_verificationCodeInput__RgX85"))
        )
        
        # Prompt user for verification code
        verification_code = input("Enter the verification code sent to your email: ")
        verification_input.send_keys(verification_code)
        
        # Find and click the "Log In" button
        logging.info("Clicking Log In button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'Button_buttonBase__Bv9Vx') and contains(@class, 'Button_primary__6UIn0') and text()='Log In']"))
        )
        login_button.click()
        
        # Wait for a short time to allow login process to complete
        logging.info("Waiting for login to complete...")
        time.sleep(5)  # Wait for 5 seconds
        
        logging.info("Login process completed.")
    except TimeoutException as e:
        logging.error(f"Timeout occurred: {str(e)}")
        logging.info("Current page source:")
        logging.info(driver.page_source)
        raise
    except NoSuchElementException as e:
        logging.error(f"Element not found: {str(e)}")
        logging.info("Current page source:")
        logging.info(driver.page_source)
        raise
    except Exception as e:
        logging.error(f"An unexpected error occurred: {str(e)}")
        raise

def scroll_and_collect_images(driver, max_scroll_time=600):
    logging.info("Scrolling and collecting image URLs...")
    start_time = time.time()
    image_urls = set()
    last_image_count = 0
    scroll_pause_time = 2
    no_new_content_count = 0
    max_no_new_content = 5
    
    scroll_container_js_path = """document.querySelector("div[class*='ChatMessagesScrollWrapper']")"""
    
    while time.time() - start_time < max_scroll_time:
        # Scroll to top of the conversation container
        driver.execute_script(f"arguments[0].scrollTop = 0;", driver.execute_script(f"return {scroll_container_js_path}"))
        time.sleep(scroll_pause_time)
        
        # Try to find and interact with the infinite scroll trigger
        try:
            trigger = driver.find_element(By.CSS_SELECTOR, "div[class*='InfiniteScroll_pagingTrigger']")
            driver.execute_script("arguments[0].scrollIntoView(true);", trigger)
            time.sleep(scroll_pause_time)  # Wait for content to load
        except NoSuchElementException:
            logging.info("Infinite scroll trigger not found. Might have reached the top.")
        
        # Collect image URLs from all possible sources
        new_images_found = False
        
        # Look for images in message pairs
        message_pairs = driver.find_elements(By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']")
        logging.info(f"Found {len(message_pairs)} message pairs")
        
        # Look for images in any container within the chat
        img_elements = driver.find_elements(By.CSS_SELECTOR, "img[src^='http']")
        
        for img in img_elements:
            try:
                src = img.get_attribute('src')
                if src and src not in image_urls:
                    image_urls.add(src)
                    new_images_found = True
                    logging.info(f"Added new image URL: {src}")
            except StaleElementReferenceException:
                continue
        
        # Look for image URLs in text content (e.g., markdown links)
        text_elements = driver.find_elements(By.CSS_SELECTOR, "div[class*='Markdown_markdownContainer']")
        for elem in text_elements:
            try:
                text = elem.text
                urls = re.findall(r'(https?://\S+\.(?:jpg|jpeg|png|gif))', text)
                for url in urls:
                    if url not in image_urls:
                        image_urls.add(url)
                        new_images_found = True
                        logging.info(f"Added new image URL from text: {url}")
            except StaleElementReferenceException:
                continue
        
        if new_images_found:
            logging.info(f"Found {len(image_urls)} unique images so far...")
            no_new_content_count = 0
        else:
            no_new_content_count += 1
            logging.info(f"No new images found. Count: {no_new_content_count}")
        
        if no_new_content_count >= max_no_new_content:
            logging.info(f"No new content found for {max_no_new_content} consecutive scrolls. Assuming we've reached the top.")
            break
    
    logging.info(f"Scrolling completed in {time.time() - start_time:.2f} seconds")
    return list(image_urls)

def download_image(img_url, save_dir, index, existing_hashes):
    try:
        response = requests.get(img_url, timeout=10)
        if response.status_code == 200:
            # Hash the image content
            img_content = response.content
            img_hash = hashlib.md5(img_content).hexdigest()
            
            # Check if this image hash already exists
            if img_hash in existing_hashes:
                logging.info(f"Duplicate image found for URL: {img_url}")
                return False, img_hash
            
            file_extension = os.path.splitext(urlparse(img_url).path)[1] or '.jpg'
            safe_filename = f"image_{index}_{img_hash}{file_extension}"
            file_path = os.path.join(save_dir, safe_filename)
            
            with open(file_path, 'wb') as f:
                f.write(img_content)
            logging.info(f"Saved {safe_filename}")
            return True, img_hash
        else:
            logging.warning(f"Failed to download image from {img_url}")
            return False, None
    except Exception as e:
        logging.error(f"Error downloading image from {img_url}: {str(e)}")
        return False, None

def save_poe_chat_images(url, save_dir):
    email = os.getenv('POE_EMAIL')
    if not email:
        raise ValueError("POE_EMAIL environment variable is not set")

    driver = setup_driver()
    
    try:
        login_to_poe(driver, email)
        
        logging.info(f"Navigating to chat URL: {url}")
        driver.get(url)
        
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.ChatMessagesView_messagePair__ZEXUz"))
            )
        except TimeoutException:
            logging.warning("Timeout waiting for chat messages to load. Proceeding anyway...")
        
        img_urls = scroll_and_collect_images(driver)
        logging.info(f"Found {len(img_urls)} unique image URLs")
        
        os.makedirs(save_dir, exist_ok=True)
        
        existing_hashes = set()
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(download_image, img_url, save_dir, i, existing_hashes) for i, img_url in enumerate(img_urls)]
            for future in concurrent.futures.as_completed(futures):
                success, img_hash = future.result()
                if success and img_hash:
                    existing_hashes.add(img_hash)
        
        successful_downloads = len(existing_hashes)
        logging.info(f"Successfully downloaded {successful_downloads} unique images out of {len(img_urls)} URLs")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    poe_chat_url = input("Enter the Poe chat URL: ")
    save_directory = input("Enter the directory to save images (default: PoeChatImages): ") or "PoeChatImages"
    save_poe_chat_images(poe_chat_url, save_directory)
