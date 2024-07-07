import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from datetime import datetime
from urllib.parse import urlparse
import time
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("start-maximized")
    return webdriver.Chrome(options=options)

def login_to_poe(driver, email):
    try:
        logging.info("Navigating to login page...")
        driver.get("https://poe.com/login")
        
        logging.info("Waiting for email input field...")
        email_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        
        logging.info("Entering email...")
        email_input.send_keys(email)
        
        logging.info("Clicking Go button...")
        go_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='Go']"))
        )
        go_button.click()
        
        logging.info("Waiting for verification code input...")
        verification_input = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input.VerificationCodeInput_verificationCodeInput__RgX85"))
        )
        
        verification_code = input("Enter the verification code sent to your email: ")
        verification_input.send_keys(verification_code)
        
        logging.info("Clicking Log In button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'Button_buttonBase__Bv9Vx') and contains(@class, 'Button_primary__6UIn0') and text()='Log In']"))
        )
        login_button.click()
        
        logging.info("Waiting for login to complete...")
        time.sleep(5)
        
        logging.info("Login process completed.")
    except Exception as e:
        logging.error(f"An error occurred during login: {str(e)}")
        raise

def scroll_and_collect_messages(driver, max_scroll_time=600):
    logging.info("Scrolling and collecting messages...")
    start_time = time.time()
    messages = []
    last_message_count = 0
    scroll_pause_time = 2
    no_new_content_count = 0
    max_no_new_content = 5
    bot_name = None
    
    scroll_container_js_path = """document.querySelector("div[class*='ChatMessagesScrollWrapper']")"""
    
    while time.time() - start_time < max_scroll_time:
        driver.execute_script(f"arguments[0].scrollTop = 0;", driver.execute_script(f"return {scroll_container_js_path}"))
        time.sleep(scroll_pause_time)
        
        try:
            trigger = driver.find_element(By.CSS_SELECTOR, "div[class*='InfiniteScroll_pagingTrigger']")
            driver.execute_script("arguments[0].scrollIntoView(true);", trigger)
            time.sleep(scroll_pause_time)
        except NoSuchElementException:
            logging.info("Infinite scroll trigger not found. Might have reached the top.")
        
        message_pairs = driver.find_elements(By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']")
        new_messages_found = False
        
        for pair in message_pairs:
            try:
                human_message = pair.find_element(By.CSS_SELECTOR, "div[class*='Message_humanMessageBubble']").text
                bot_message = pair.find_element(By.CSS_SELECTOR, "div[class*='Message_botMessageBubble']").text
                
                if (human_message, bot_message) not in messages:
                    messages.append((human_message, bot_message))
                    new_messages_found = True
                
                if not bot_name:
                    try:
                        bot_name_element = pair.find_element(By.CSS_SELECTOR, "div.BotHeader_textContainer__kVf_I p")
                        bot_name = bot_name_element.text
                    except NoSuchElementException:
                        pass
            except (NoSuchElementException, StaleElementReferenceException):
                continue
        
        if new_messages_found:
            logging.info(f"Found {len(messages)} message pairs so far...")
            no_new_content_count = 0
        else:
            no_new_content_count += 1
            logging.info(f"No new messages found. Count: {no_new_content_count}")
        
        if no_new_content_count >= max_no_new_content:
            logging.info(f"No new content found for {max_no_new_content} consecutive scrolls. Assuming we've reached the top.")
            break
    
    logging.info(f"Scrolling completed in {time.time() - start_time:.2f} seconds")
    return messages[::-1], bot_name

def format_and_save_messages(messages, save_dir, chat_url, bot_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    url_part = urlparse(chat_url).path.split('/')[-1][:20]
    filename = f"poe_chat_{url_part}_{timestamp}.txt"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"Poe Chat Transcript\n")
        f.write(f"URL: {chat_url}\n")
        f.write(f"Bot Name: {bot_name or 'Unknown'}\n")
        f.write(f"Downloaded on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("=" * 80 + "\n\n")
        for i, (human, bot) in enumerate(messages, 1):
            f.write(f"Message Pair {i}:\n")
            f.write("Human: " + human.strip() + "\n\n")
            f.write(f"{bot_name or 'Bot'}: " + bot.strip() + "\n\n")
            f.write("-" * 80 + "\n\n")
    logging.info(f"Messages saved to {filepath}")
    return filepath

def save_poe_chat_text(url, save_dir):
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
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']"))
            )
        except TimeoutException:
            logging.warning("Timeout waiting for chat messages to load. Proceeding anyway...")
        
        messages, bot_name = scroll_and_collect_messages(driver)
        logging.info(f"Collected {len(messages)} message pairs")
        
        os.makedirs(save_dir, exist_ok=True)
        saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
        print(f"Chat transcript saved to: {saved_file}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    poe_chat_url = input("Enter the Poe chat URL: ")
    save_directory = input("Enter the directory to save the transcript (default: PoeChatTranscripts): ") or "PoeChatTranscripts"
    save_poe_chat_text(poe_chat_url, save_directory)
