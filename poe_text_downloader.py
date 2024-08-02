import os
import sys
import signal
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
    no_new_messages_count = 0
    max_no_new_messages = 5  # After this many scrolls with no new messages, we'll stop

    scroll_container_js_path = """document.querySelector("div[class*='ChatMessagesScrollWrapper']")"""

    while time.time() - start_time < max_scroll_time:
        # Scroll to top
        driver.execute_script(f"arguments[0].scrollTop = 0;", driver.execute_script(f"return {scroll_container_js_path}"))
        time.sleep(scroll_pause_time)

        # Find all message pairs
        message_pairs = driver.find_elements(By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']")

        new_messages_found = False
        for pair in message_pairs:
            try:
                human_message = ""
                bot_message = ""

                human_elements = pair.find_elements(By.CSS_SELECTOR, "div.ChatMessage_rightSideMessageWrapper__r0roB div.Message_rightSideMessageBubble__ioa_i > div > p")
                bot_elements = pair.find_elements(By.CSS_SELECTOR, "div.Message_leftSideMessageBubble__VPdk6 > div > p")

                if human_elements:
                    human_message = human_elements[0].text
                if bot_elements:
                    bot_message = bot_elements[0].text

                # If either message is non-empty, add the pair
                if human_message or bot_message:
                    if (human_message, bot_message) not in messages:
                        messages.append((human_message, bot_message))
                        new_messages_found = True
                        logging.info(f"New message pair found. Human: {human_message[:50]}... Bot: {bot_message[:50]}...")
            except Exception as e:
                logging.error(f"Error extracting message pair: {str(e)}")

        if new_messages_found:
            no_new_messages_count = 0
        else:
            no_new_messages_count += 1
            logging.info(f"No new messages found. Count: {no_new_messages_count}")

        if no_new_messages_count >= max_no_new_messages:
            logging.info("Reached the top of the chat or no new messages. Stopping scroll.")
            break

        # If no new messages, try to scroll more
        try:
            trigger = driver.find_element(By.CSS_SELECTOR, "div[class*='InfiniteScroll_pagingTrigger']")
            driver.execute_script("arguments[0].scrollIntoView(true);", trigger)
        except NoSuchElementException:
            logging.info("Infinite scroll trigger not found. Might have reached the top.")
            break

    logging.info(f"Scrolling completed in {time.time() - start_time:.2f} seconds")

    # Extract bot name
    try:
        bot_name_element = driver.find_element(By.CSS_SELECTOR, "div[class*='BotHeader_textContainer'] p")
        bot_name = bot_name_element.text
        logging.info(f"Bot name found: {bot_name}")
    except NoSuchElementException:
        bot_name = None
        logging.warning("Bot name not found")

    return messages[::-1], bot_name  # Reverse the list to get oldest messages first

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
            if human:
                f.write("Human: " + human.strip() + "\n\n")
            if bot:
                f.write(f"{bot_name or 'Bot'}: " + bot.strip() + "\n\n")
            if not human and not bot:
                f.write("(Empty message pair)\n\n")
            f.write("-" * 80 + "\n\n")
    logging.info(f"Messages saved to {filepath}")
    return filepath

def save_poe_chat_text(url, save_dir):
    email = os.getenv('POE_EMAIL')
    if not email:
        raise ValueError("POE_EMAIL environment variable is not set")

    driver = setup_driver()
    messages = []
    bot_name = None

    def signal_handler(sig, frame):
        logging.info("Interrupt received, saving collected messages...")
        if messages:
            saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
            print(f"Partial chat transcript saved to: {saved_file}")
        driver.quit()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        login_to_poe(driver, email)

        logging.info(f"Navigating to chat URL: {url}")
        driver.get(url)

        try:
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[class*='ChatMessagesView_messagePair']"))
            )
            logging.info("Chat messages loaded successfully")
        except TimeoutException:
            logging.warning("Timeout waiting for chat messages to load. Proceeding anyway...")

        # Add a longer delay to ensure all messages are loaded
        time.sleep(10)

        messages, bot_name = scroll_and_collect_messages(driver)
        logging.info(f"Collected {len(messages)} message pairs")

        os.makedirs(save_dir, exist_ok=True)
        saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
        print(f"Chat transcript saved to: {saved_file}")

    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        if messages:
            saved_file = format_and_save_messages(messages, save_dir, url, bot_name)
            print(f"Partial chat transcript saved to: {saved_file}")
    finally:
        driver.quit()

if __name__ == "__main__":
    poe_chat_url = input("Enter the Poe chat URL: ")
    save_directory = input("Enter the directory to save the transcript (default: PoeChatTranscripts): ") or "PoeChatTranscripts"
    save_poe_chat_text(poe_chat_url, save_directory)
